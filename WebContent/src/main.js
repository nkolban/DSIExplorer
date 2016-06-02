/**
 * @module foobar
 */

/**
 * The table widget used in the project is dataTables (https://datatables.net/)
 * The file loader widget used in the project is (https://blueimp.github.io/jQuery-File-Upload/)
 */

/**
 * Design notes
 * LocalStorage is used by the application to save data that we wish to retrieve at a future time.  The storage
 * keys that we are using are:
 * 
 * savedEvents
 * -----------
 * An array of objects of the form:
 * {
 *   name: <The name of the save>,
 *   data: <The text of the event>,
 *   lastUpdated: <The date that the entry was last updated>
 * }
 * 
 * sentHistory
 * -----------
 * A history of events that have previously been sent.  An array of objects of the form:
 * {
 *   name: <Deprecated>,
 *   data: <The text of the event>,
 *   timestamp: <The date that the event was sent>
 * } 
 */
/**
 * @memberOf main
 */
$(function() {
	/**
	 * @memberOf main
	 */
	var entitiesTabIndex = 1;
	
	/**
	 * @memberOf main
	 */
	var eventsTabIndex = 2;
	
	/**
	 * @memberOf main
	 */
	var gmap;
	
	/**
	 * @memberOf main
	 * @description
	 * The description of the entities and events for this solution
	 * {
	 *   entities: [
	 *   {
	 *     $IdAttrib:
	 *     $Name:
	 *     <field>:
	 *   }, ...];
	 *   events: []
	 * }
	 */
	var bomModel = null;
	
	
	Storage.prototype.setObject = function(key, value) {
	    this.setItem(key, JSON.stringify(value));
	};

	Storage.prototype.getObject = function(key) {
	    var value = this.getItem(key);
	    return value && JSON.parse(value);
	};
	$('body').layout();
	
	document.oncontextmenu = function() {return false;};
	
	$("#tabs").tabs({
		disabled: [ entitiesTabIndex, eventsTabIndex],
		activate: function(event, ui) {
			var id = ui.newPanel.attr('id');
			if (id == "mapTab") {
				gmap.refresh();
			}
		}
	});

    
    initGeneral();
    initEntitiesTab();
    initEventSaveLoad();
    initEventsTab();
    initSolutionsTab();
    initGlobalPropertiesTab();
    initMapTab();
    
    // Debugging page
    // Clear local storage
    $("#clearLocalStorage").button().click(function() {
    	localStorage.clear();
    });
	
	DSIJMX.listGlobalProperties(function(data) {
		var values = [];
		$.each(data, function(index, propertyName) {
			values.push({ name: propertyName, value: "XXX"});
		});
		$('#globalProperties').DataTable().clear().rows.add(values).draw();
	});


	/**
	 * @private
	 * @memberOf main
	 */
	function entityToTreeNode(entity) {
		var entityNode = {
			icon: "images/entity.png",
			text: entity[entity["$IdAttrib"]],
			state: {opened: false},
			children: [],
			data: {
				id: entity[entity["$IdAttrib"]],
				entityRoot: true
			}
		};
		// Iterate over each of the members of the current entity.
		$.each(entity, function(name, propertyValue) {
			if (!name.startsWith("$")) {
				entityNode.children.push({
					icon: "images/field.png",
					text:  name + ": " + propertyToString(propertyValue),
					state: {opened: true},
					children: []
				});
			}
		}); // End of iteration over each of the members of the current entity
		return  entityNode;
	};


	/**
	 * @function
	 * @inner
	 * @private
	 * @memberOf main
	 * @description
	 * Add the entities to a jsTree.
	 * We are provided with an array of entities and our goal is to create an
	 * array of jstree nodes.  We iterate through the entities and for each
	 * one create its corresponding jstree node.  When we are finished, we
	 * then sort the nodes into order.
	 */
	function entitiesToTree(entities) {
		var treeNodes = [];
		
		// It is possible we will not have any entities
		if (entities != null) {
			// Iterate over each of the entities
			$.each(entities.entities, function(index, entity){
				treeNodes.push(entityToTreeNode(entity));
			}); // End of iteration over each of the entities
		}
		
		// Sort the nodes
		treeNodes.sort(function(node1, node2) {
			return node1.text.localeCompare(node2.text);
		});

		$("#entitiesTree").jstree(true).settings.core.data = treeNodes;
		$("#entitiesTree").jstree(true).refresh();
	}; // End of entitiesToTree


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Update the entity types for the selected solution.
	 */
	function updateEntityTypes() {
		var selectedSolution = getSelectedSolution();
		if (selectedSolution == null) {
			return;
		}
		
		DSIREST.listEntityTypes(selectedSolution.name).done(function(entityTypes) {
			console.log("Got entityTypes: %O", entityTypes);
			$("#entityTypes").empty();
			$.each(entityTypes.entityTypes, function(index, value) {
				var option = $("<option></option>").attr("value", value).text(value);
				$("#entityTypes").append(option);
			});
			$("#entityTypes").selectmenu("refresh");
		});
	}; // End of updateEntityTypes


	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function refreshSolutions() {
		DSIJMX.getSolutions(function(solutions) {
			console.log("Solns=%O", solutions);
			$('#solutions').DataTable().clear().rows.add(solutions).draw();
		});
	}; // End of refresh


	/**
	 * @private
	 * @memberOf main
	 */
	function getSelectedSolution() {
		var selectedRow = $("#solutions").DataTable().row({selected: true});
		return selectedRow.data();
	}; // End of getSelectedSolution


	/**
	 * @private
	 * @memberOf main
	 */
	function solutionToSimpleName(solution) {
		var splitValues = solution.name.split(".");
		if (splitValues.length == 1) {
			return splitValues[0];
		}
		return (splitValues[1]);
	}; // End of solutionToSimpleName


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Get the current selected entity type.
	 */
	function getSelectedEntityType() {
		return $("#entityTypes").val();
	}; // End of getSelectedEntityTypes


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Find the entity model for the named entity type or null if not present.
	 */
	function getModelFromEntityType(entityType) {
		if (bomModel == null) {
			return null;
		}
		var foundModel = null;
		$.each(bomModel.entities, function(index, entityModel){
			if (entityModel["$Name"] == entityType) {
				foundModel = entityModel;
				return false;
			}
		});
		return foundModel;
	}; // End of getModelFromEntityType


	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function getEventByName(name) {
		if (bomModel == null) {
			return null;
		}
		var ret = null;
		$.each(bomModel.events, function(index, value) {
			if (value["$Name"] == name) {
				ret = value;
			}
		});
		return ret;
	}; // End of getEventByName


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * We keep a history of previously sent events.  Here we record a new event that was just
	 * sent.
	 */
	function saveSendEvent(sendEvent) {
		// Create a record for saving a sent event.  The data is saved in the LocalStorage "sentHistory" array.
		// A record will contain:
		//
		// o timestamp
		// o data
		// o name
		var record = {
			name: "XXX",
			data: sendEvent,
			timestamp: new Date()
		};
		var currentData = localStorage.getObject("sentHistory");
		if (currentData == null) {
			currentData = [];
		}
		currentData.push(record);
		localStorage.setObject("sentHistory", currentData);
	}; // End of saveSendEvent()
	
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @param name The name of the event to save.
	 * @param sendEvent The text of the event.
	 * @description
	 * Save the event with a given name to the LocalStorage with the key of "savedEvents".
	 * If there is already a saved event with the same name then we replace that entry.
	 */
	function saveEvent(name, sendEvent) {
		name = name.trim();
		if (name.length == 0) {
			console.log("saveEvent: Can't save an event with no name.");
			return;
		}
		
		var record = {
			name: name,
			data: sendEvent,
			lastUpdated: new Date()
		}
		var currentData = localStorage.getObject("savedEvents");
		if (currentData == null) {
			currentData = [];
		}
		// See if we have a current record that contains the event.
		var found = false;
		$.each(currentData, function(index, value){
			if (value.name == name) {
				found = true;
				currentData[index] = record;
			}
		});
		if (!found) {
			currentData.push(record);
		}
		localStorage.setObject("savedEvents", currentData);
	}; // End of saveEvent
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function deleteSavedEvent(name) {
		var currentData = localStorage.getObject("savedEvents");
		if (currentData == null) {
			return;
		}
		// See if we have a current record that contains the event.
		var found = false;
		var foundIndex;
		$.each(currentData, function(index, value){
			if (value.name == name) {
				foundIndex = index;
			}
		});
		if (!found) {
			currentData.splice(foundIndex, 1);
			localStorage.setObject("savedEvents", currentData);
		}
	};
	
	/**
	 * @function
	 * @private
	 * @function
	 * @memberOf main
	 */
	function initGeneral() {
		$("#errorDialog").dialog({
		autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Error",
	    	buttons: [{
	    		text: "Close",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
		});
	}; // End of generalInit
	
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function initGlobalPropertiesTab() {
		$('#globalProperties').DataTable({
			autoWidth: false,
			searching: false,
			paging: false,
			info: false,
			select: 'single',
			"columns": [
			   { data: "name",  title: "Name" },
			   { data: "value", title: "Value" }
			]
		});
	}; // End of initGlobalProperties
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function initSolutionsTab() {

// Define the structure and options of the solutions table
		var table = $('#solutions').DataTable({
			autoWidth: false,
			searching: false,
			paging: false,
			info: false,
			"columns": [
			   { data: "name",    title: "Solution Name" },
			   { data: "version", title: "Solution Version" }
			],
			select: 'single'
		});
		
		// Handle a selection change on the solutions table.  When a new solution is selected, we need to get the new list
		// of entity types that are available.  In addition, we need to enable the buttons that should only be active when
		// a solution has been selected.
		table.on('select', function(e, dt, type, indexes) {
			updateEntityTypes();
			$(".dsi_enableOnSolution").button("option", "disabled", false);
			$("#tabs").tabs("option", "disabled", []);
			$("#selectedSolutionLabel").text(getSelectedSolution().name);
		}); // End of solution selection changed.
		
		table.on('deselect', function(e, dt, type, indexes) {
			$(".dsi_enableOnSolution").button("option", "disabled", true);
			$("#tabs").tabs("option", "disabled", [entitiesTabIndex, eventsTabIndex]);
			$("#selectedSolutionLabel").text("None");
			bomModel = null;
			$("#bomLoadedLabel").text("None");
		});
		
// Handle the user clicking the stop button to stop a solution.
		$("#stop").button({
			icons: {primary: "ui-icon-stop"}
		}).click(function() {
			console.log("Stop! - selected: " + table.rows({selected: true}).count());
			table.rows({selected: true}).every(function() {
				console.log("Stopping: %O", this.data());
				DSIJMX.stopSolution(this.data().name, function() {
					refreshSolutions();
				});
			});
		}); // End of stop button

		
// Handle the user clicking the activate button to activate a solution		
		$("#activate").button({
			icons: {primary: "ui-icon-play"}
		}).click(function() {
			console.log("Activate! - selected: " + table.rows({selected: true}).count());
			table.rows({selected: true}).every(function() {
				console.log("Activating: %O", this.data());
				DSIJMX.activateSolution(this.data().name+"-0.0", function() {
					refreshSolutions();
				});
			});
		}); // End of activate button

// Handle the user clicking the undeploy button to undeploy a solution		
		$("#undeploy").button({
			icons: {primary: "ui-icon-eject"}
		}).click(function() {
			console.log("Undeploy! - selected: " + table.rows({selected: true}).count());
			table.rows({selected: true}).every(function() {
				console.log("Undeploying: %O", this.data());
				DSIJMX.undeploySolution(this.data().name + "-0.0", function() {
					refreshSolutions();
				});
			});
		});

// Handle the user clicking the refresh button to refresh the solutions		
		$("#refresh").button({
			icons: {primary: "ui-icon-refresh"}
		}).click(function() {
			refreshSolutions();
		});
		
// Create the fileupload control		
	    $('#bomFileUpload').fileupload({
	        dataType: 'json',
	        "url": "/RestTest1/xxx/myPath",
	        done: function (e, data) {
	        	bomModel = data.result;
	        	console.log("Parsed Bom: %O", bomModel);
	        	$("#bomLoadedLabel").text("Yes");
	        }
	    });

// Handle the user clicking the file upload button	   
	    $("#bomFileUploadButton").button({
			icons: {primary: "ui-icon-document"}
		}).click(function() {
	    	$("#bomFileUpload").click();
	    });
	    
	    // MUST BE LAST THING DONE IN INITIALIZATION
		$(".dsi_enableOnSolution").button("option", "disabled", true);
	}; // End of initSolutionsTab
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Initialize the entities tab.
	 */
	function initEntitiesTab() {
		$("#entityTypes").selectmenu();
		
		var refreshEntities = function() {
			var solution = getSelectedSolution();
			if (solution == null) {
				return;
			}
			var selectedEntityType = getSelectedEntityType();
			var entityModel = getModelFromEntityType(selectedEntityType);
			if (entityModel != null) {
				// Create the dynamic columns used to show the data.
				var columns = [];
				
				// A function used to render a column's data if it is not a simple type
				var renderColumn = function(data, type, row, meta) {
					return propertyToString(data);
				};
				
				// Iterate over each of the properties in the entity model.  Each property could be
				// a column of data in the resulting table.  Columns which start with "$" are off limits
				// and used as meta data such as describing the data type of the entity or which
				// entity is the attribute.
				$.each(entityModel, function(propertyName, propertyValue) {
					if (!propertyName.startsWith("$")) {
						var newColumn = {
							title: propertyName,
							data: propertyName
						};
						if (propertyValue == "com.ibm.geolib.geom.Point") {
							newColumn.render = renderColumn;
						}
						columns.push(newColumn);
					}
				});
				
				//$("#entitiesTable").DataTable("option", "columns", columns);
				$("#entitiesTable").remove();
				$("#entitiesTable_wrapper").remove();
				$("#entitiesTableDiv").append("<table id='entitiesTable'></table>");
				$("#entitiesTable").DataTable({
					autoWidth: false,
					searching: false,
					paging: false,
					info: false,
					"columns": columns,
					select: 'single'
				}); // End of #entitiesTable - DataTable constructor
			}
			
			// Ask DSI for the list of entities.
			DSIREST.listEntityInstances(solution.name, selectedEntityType).done(function(data){
				entitiesToTree(data);
				if (data != null) {
					$("#entitiesTable").DataTable().rows.add(data.entities).draw();
				}
			});
		}; // End of refreshEntities()
		
		// Handle a request to get/refresh the list of entities.
		$("#getEntities").button().click(refreshEntities);
		
		// Handle a request to elete all the entities.
		$("#deleteAllEntities").button().click(function() {
			var solution = getSelectedSolution();
			if (solution == null) {
				return;
			}
			DSIREST.deleteAllEntities(solution.name, getSelectedEntityType());
			refreshEntities();
		});
		
		// Collapse all entries in the tree
		$("#collapseAll").button().click(function() {
			$("#entitiesTree").jstree(true).close_all();
		});
		
		// Expand all entries in the tree
		$("#expandAll").button().click(function() {
			$("#entitiesTree").jstree(true).open_all();
		});
		
		// Create the tree
		$("#entitiesTree").jstree({
			core: {
				"animation":      false,
				"multiple":       false,
				"check_callback": true
			},
			contextmenu: {
				items: function(node) {
					if (node.data == null || node.data.entityRoot != true) {
						return;
					}
					return {
	// Add a refresh button that will refresh the nodes in the entities tree.					
						"refresh": {
							label: "Refresh",
							icon: "images/refresh.gif",
							action: function(data) {
			                    var inst = $.jstree.reference(data.reference);
		                        var node = inst.get_node(data.reference);
		                        var selectedSolution = getSelectedSolution();
		                        var selectedEntityType = getSelectedEntityType();
		                        var entityId = node.data.id;
		                        console.log("Time to refresh entity with id: " + entityId + " from solution " + selectedSolution.name + " of type " + selectedEntityType);
		                        DSIREST.getEntity(selectedSolution.name, selectedEntityType, entityId).done(function(entity){
		                        	var replacementTreeNode = entityToTreeNode(entity);
		                        	var treeData = $("#entitiesTree").jstree(true).settings.core.data;
		                        	$.each(treeData, function(index, treeNode) {
		                        		if (treeNode.data.id == entityId) {
		                        			//treeData[index] = {};
		                        			console.log("Create a tree node from an entity!");
		                        			treeData[index] = replacementTreeNode;
		                        		}
		                        	});
		                        	//$("#entitiesTree").jstree(true).redraw();
		                        	//debugger;
		                        	$("#entitiesTree").jstree(true).refresh_node(node);
		                        });
							} // End of the refresh item action
						}, // End of the refresh item
						
	// Add a delete button that will delete the underlying entity in DSI.					
						"delete": {
							separator_before: true,
							label: "Delete",
							icon: "images/delete.gif",
							action: function(data) {
			                    var inst = $.jstree.reference(data.reference);
		                        var node = inst.get_node(data.reference);
		                        var selectedSolution = getSelectedSolution();
		                        var selectedEntityType = getSelectedEntityType();
		                        var entityId = node.data.id;
		                        console.log("Time to delete entity with id: " + entityId + " from solution " + selectedSolution.name + " of type " + selectedEntityType);
		                        DSIREST.deleteEntity(selectedSolution.name, selectedEntityType, entityId).done(function(){
		                        	$("#entitiesTree").jstree(true).delete_node(node);
		                        });
							} // End of the delete item action
						} // End of the delete item
					} // End of return list of items in the context menu
				} // End of items in the context menu
			}, // End of context menu definitions
			plugins: ["contextmenu"]
		}); // End of jstree initialization
		
		/*
		// Create a DataTable for showing the entities.
		$("#entitiesTable").DataTable({
			autoWidth: false,
			searching: false,
			paging: false,
			info: false,
			"columns": [
			   { data: "name",    title: "Name" },
			   { data: "lastUpdated", title: "Date", render: function(data, type, row, meta) {
				   //debugger;
				   return new Date(data).toLocaleString();
			   }}
			],
			select: 'single'
		}); // End of #entitiesTable - DataTable constructor
		*/
	}; // End of initEntitiesTab


	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function initEventsTab() {
		$("#sendEvent").button({disabled: true});
		
		// Handle a request to send an event to DSI.
		$("#sendEvent").click(function() {
			var eventData = $("#eventData").val().trim();
			if (eventData.length == 0) {
				return;
			}
			DSIREST.sendEvent(solutionToSimpleName(getSelectedSolution()), eventData).then(function() {
				// On success
				saveSendEvent(eventData);
			}, function(errorObj) {
				// On error
				showError(errorObj.responseJSON.message);
			});
		});
		
		// Disable the Send button if there is no input
		$("#eventData").on("input", function() {
			var enable = $("#eventData").val().trim().length>0?"enable":"disable"
			$("#sendEvent").button(enable);
			$("#eventSaveButton").button(enable);
			
		});
		
	    $("#confirmReplace").dialog({
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Confirm replace",
	    	buttons: [{
	    		text: "Replace",
	    		click: function() {
	    			$("#eventData").data("replaceFunction")();
	    			$(this).dialog("close");
	    		}
	    	}, {
	    		text: "Cancel",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    }); // End of confirmReplaceDialog
	    
		/**
	     * Add a context menu to the event data text area.
	     */
	    $.contextMenu({
	    	selector: "#eventData",
	    	autoHide: true, // Should the menu disappear when the mouse moves out of the trigger area.
	    	build: function(triggerElement, e) {
	    		if (bomModel == null) {
	    			return false;
	    		}

	    		var items = {};
	    		var itemCallback = function(itemKey, opt) {
	    			var selectedEvent = getEventByName(itemKey);
	    			var replaceFunction = function() {
	        			if (selectedEvent == null) {
	        				return;
	        			}
	        			$("#eventData").val(JSON.stringify(selectedEvent, null, 2));
	    			};
	        		var eventJSON = $("#eventData").val().trim();
	        		if (eventJSON.length > 0) {
	        			// There is ALREADY text in the data ... validate that we are ok to overwrite with an event
	        			// template.
	            		$("#eventData").data("replaceFunction", replaceFunction);
	        			$("#confirmReplace").dialog("open");
	        		} else {
	        			replaceFunction();
	        		}
	    		}; // End of itemCallback definition
	    		
	    		$.each(bomModel.events, function(index, currentEventModel) {
	    			items[currentEventModel["$Name"]] = {
	    				name: currentEventModel["$Name"],
	    				callback: itemCallback
	    			}
	    		});
	    		
	    		return {
	    			items: items
	    		}
	    	}
	    }); // End of context menu for event data text area.
	}; // End of initEventsTab
	
	/**
	 * @function
	 * @private
	 * @function
	 * @memberOf main
	 */
	function initMapTab() {
		gmap = new GMaps({
			div: "#map",
			width: "100%",
			height: "500px",
	        lat: -12.043333,
	        lng: -77.028333
		});
	}; // End of initMapTab
	
	/**
	 * @private
	 * @memberOf main
	 */
	function initEventSaveLoad() {
		$("#eventHistory").button().click(function() {
			// Populate the table with the event history
			$("#eventHistoryTable").DataTable().clear().rows.add(localStorage.getObject("sentHistory")).draw();
			$("#eventHistoryDialog").dialog("open");
		});
		
		$("#eventSaveButton").button({disabled: true}).click(function() {
			$("#saveEventName").val("");
			$("#saveEventDialog").dialog("open");
		});
		$("#eventLoadButton").button().click(function() {
			updateSavedEventsTable();
			$("#loadEventDialog").dialog("open");	
		});
		
	    $("#saveEventDialog").dialog({
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Save event",
	    	buttons: [{
	    		text: "Save",
	    		click: function() {
	    			saveEvent($("#saveEventName").val(), $("#eventData").val().trim());
	    			$(this).dialog("close");
	    		}
	    	}, {
	    		text: "Cancel",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    });
	    
		$('#savedEventsTable').DataTable({
			autoWidth: false,
			searching: false,
			paging: false,
			info: false,
			"columns": [
			   { data: "name",    title: "Name" },
			   { data: "lastUpdated", title: "Date", render: function(data, type, row, meta) {
				   //debugger;
				   return new Date(data).toLocaleString();
			   }}
			],
			select: 'single'
		});
		
	    $("#loadEventDialog").dialog({
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	width: 600,
	    	title: "Load event",
	    	buttons: [{
	    		text: "Use",
	    		click: function() {
	    			var savedEvent = $("#savedEventsTable").DataTable().row({selected: true}).data();
	    			$("#eventData").val(savedEvent.data);
	    			$(this).dialog("close");
	    		}
	    	},{
	    		text: "Delete",
	    		click: function() {
	    			// Determine which item in the savedEventsTable was selected
	    			var savedEvent = $("#savedEventsTable").DataTable().row({selected: true}).data();
	    			if (savedEvent != null) {
	    				deleteSavedEvent(savedEvent.name);
	    				updateSavedEventsTable();
	    			}
	    		}
	    	}, {
	    		text: "Cancel",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    });
	    
	    $("#eventHistoryDialog").dialog({
	    	width: 600,
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Historic events",
	    	buttons: [{
	    		text: "Use",
	    		click: function() {
	    			var selectedRows = $("#eventHistoryTable").DataTable().rows({selected: true});
	    			if (selectedRows.count() != 1) {
	    				return;
	    			}
	    			
	    			var selectedSolution;
	    			selectedRows.every(function() {
	    				selectedSolution = this.data();
	    			})
	    			$("#eventData").val(selectedSolution.data);
	    			$("#sendEvent").button("enable");
	    			$(this).dialog("close");
	    		}
	    	},
	    	{
	    		text: "Clear",
	    		click: function() {
	    			localStorage.setObject('sentHistory', []);
	    			$(this).dialog("close");
	    		}
	    	},
	    	{
	    		text: "Cancel",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    }); // End of eventHistoryDialog
	    
		$('#eventHistoryTable').DataTable({
			autoWidth: false,
			searching: false,
			paging: false,
			info: false,
			"columns": [
			   { data: "name",    title: "Name" },
			   { data: "timestamp", title: "Date", render: function(data, type, row, meta) {
				   //debugger;
				   return new Date(data).toLocaleString();
			   }}
			],
			select: 'single'
		});
		
		function updateSavedEventsTable() {
			var savedEvents = localStorage.getObject("savedEvents");
			if (savedEvents == null || savedEvents.length == 0) {
				$("#loadEventDialog_Table").hide();
				$("#loadEventDialog_TableNoData").show();
			} else {
				$("#loadEventDialog_Table").show();
				$("#loadEventDialog_TableNoData").hide();
				$("#savedEventsTable").DataTable().clear().rows.add(savedEvents).draw();
			}
		};
	};
	
	/**
	 * @private
	 * @memberOf main
	 */
	function showError(message) {
		$("#errorMessage").text(message);
		$("#errorDialog").dialog("open");
	};
	
	
	/**
	 * Convert a property returned from a REST call to a string.
	 * @private
	 * @memberOf main
	 */
	function propertyToString(property) {
		if (typeof property == "number") {
			return String(property);
		}
		if (typeof property == "string") {
			return property;
		}
		if (typeof property == "boolean") {
			return String(property);
		}
		if (typeof property == "object") {
			if (property.hasOwnProperty("$class")) {
				if (property["$class"] == "Point") {
					return "Point(" + property.coordinates[1] + "," + property.coordinates[0] + ")";
				}
			}
				/*
			    "location" : {
			        "$class" : "Point",
			        "coordinates" : [30.0, 50.0]
			      },
			    */
			return "Unknown Object: " + property["$class"];
		}
		return "Unknown type";
	}
	
	refreshSolutions();
}); // End of on load