/**
 * @module DSIExplorer
 */

/**
 * The table widget used in the project is dataTables (https://datatables.net/)
 * The file loader widget used in the project is jqeury-fileupload (https://blueimp.github.io/jQuery-File-Upload/)
 * The mapping package used in this project is gmaps.js (https://hpneo.github.io/gmaps/)
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
	// Since we are assuming that this page is loaded from the DSI server we should set the target of
	// DSI REST requests to the server from which the page was loaded ... including the protocol
	// and port numbers.
	if (window.location.origin !== null) {
		DSIREST.setBaseURL(window.location.origin);
	} else {
		DSIREST.setBaseURL(window.location.protocol + "://" + window.location.host);
	}

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
	 * @description
	 * The map object.  See gmaps.js package.
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
	var bomModels = {};
	loadBOMModels();
	
	Storage.prototype.setObject = function(key, value) {
	    this.setItem(key, JSON.stringify(value));
	};

	Storage.prototype.getObject = function(key) {
	    var value = this.getItem(key);
	    return value && JSON.parse(value);
	};
	
	// Initialize the body of the page for the jQuery UI Layout control
	$('body').layout({
		south__resizable: false,
		south__closable: false,
		center__onresize: function() {
			console.log("center resized!");
			$("#tabs").tabs("refresh");
		}
	});
	
	document.oncontextmenu = function() {return false;};
	
	// Create the tabs on the page.
	$("#tabs").tabs({
		"heightStyle": "fill",
		disabled: [ entitiesTabIndex, eventsTabIndex],
		activate: function(event, ui) {
			var id = ui.newPanel.attr('id');
			if (id == "mapTab") {
				gmap.refresh();
			}
		}
	});
	
	/*
	$(window).resize(function() {
		$("#tabs").tabs("refresh");
	});
	*/

    // Initialize all the content of each of the tabs.  We can potentially
	// improve our performance (if it becomes an issue) by lazy initialization
	// such that the first time a tab is shown, we initialize it.
    initGeneral();
    initEntitiesTab();
    initEventSaveLoad();
    initEventsTab();
    initSolutionsTab();
    initGlobalPropertiesTab();
    initMapTab();
    initLogsTab();
    initAboutTab();

	/**
	 * @private
	 * @memberOf main
	 * @description
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
	} // End of entityToTreeNode


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
		if (entities !== null) {
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
	} // End of entitiesToTree


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Update the entity types for the selected solution.
	 */
	function updateEntityTypes() {
		// Entity types that are to be displayed are a function of the current solution so
		// if we have no solution selected then there is nothing to do.
		var selectedSolution = getSelectedSolution();
		if (selectedSolution === null) {
			return;
		}
		
		// Since we have reloaded the entity types, there will be none selected so disable
		// any commands that rely on the entity types being enabled.
		$(".dsi_enableOnEntityType").button("option", "disabled", true);
		
		// Get the list of entity types from the server for the current solution.
		DSIREST.listEntityTypes(selectedSolution.name).done(function(entityTypes) {
			//console.log("Got entityTypes: %O", entityTypes);
			var listBox = $("#entityTypesList");
			listBox.empty();
			$.each(entityTypes.entityTypes, function(index, value) {
				listBox.append($("<option>", {value: value, text: value}));
			});
		});
	} // End of updateEntityTypes


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
	} // End of refresh


	/**
	 * @private
	 * @memberOf main
	 * @description
	 * Get the currently selected solution.  If no solution is selected, then null is returned.
	 * A solution object contains two properties:
	 * <ul>
	 * <li><b>name</b> - The name of the solution.</li>
	 * <li><b>version</b> - The version of the solution.</li>
	 * </ul>
	 */
	function getSelectedSolution() {
		var selectedRow = $("#solutions").DataTable().row({selected: true});
		if (selectedRow === null) {
			return null;
		}
		return selectedRow.data();
	} // End of getSelectedSolution


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
	} // End of solutionToSimpleName


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Get the current selected entity type.
	 */
	function getSelectedEntityType() {
		return $("#entityTypesList option:selected").val();
	} // End of getSelectedEntityTypes


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Find the entity model for the named entity type or null if not present.
	 * A model entity is of the following structure:
	 * <ul>
	 * <li><b>$IdAttrib</b> - The attribute that is the key of the entity.</li>
	 * <li><b>$Name</b> - The name of the entity type.</li>
	 * <li><b>... properties ...</b> - The value of the specific property.</li>
	 * </ul>
	 */
	function getModelFromEntityType(entityType) {
		var bomModel = getSolutionModel();
		if (bomModel === null) {
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
	} // End of getModelFromEntityType

	

	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function getEventByName(name) {
		var bomModel = getSolutionModel();
		if (bomModel === null) {
			return null;
		}
		var ret = null;
		$.each(bomModel.events, function(index, value) {
			if (value["$Name"] == name) {
				ret = value;
			}
		});
		return ret;
	} // End of getEventByName


	/**
	 * Save a just sent event.
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
		//
		// We build the desired record and then retrieve the current list of records from localStorage.
		// We then push the new record onto the end of the array and write it back to localStorage.
		var record = {
			name: "XXX",
			data: sendEvent,
			timestamp: new Date()
		};
		var currentData = localStorage.getObject("sentHistory");
		if (currentData === null) {
			currentData = [];
		}
		currentData.push(record);
		localStorage.setObject("sentHistory", currentData);
	} // End of saveSendEvent()
	
	
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
		if (name.length === 0) {
			console.log("saveEvent: Can't save an event with no name.");
			return;
		}
		
		var record = {
			name: name,
			data: sendEvent,
			lastUpdated: new Date()
		};
		var currentData = localStorage.getObject("savedEvents");
		if (currentData === null) {
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
	} // End of saveEvent
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function deleteSavedEvent(name) {
		var currentData = localStorage.getObject("savedEvents");
		if (currentData === null) {
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
	} // End of deleteSavedEvent
	
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
	} // End of generalInit
	
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 */
	function initGlobalPropertiesTab() {
		$('#globalProperties').DataTable({
			autoWidth: false,
			searching: false,
			scrollY: "400px",
			paging: false,
			info: false,
			select: 'single',
			"columns": [
			   { data: "name",  title: "Name" },
			   { data: "value", title: "Value" }
			]
		});
		DSIJMX.listGlobalProperties(function(data) {
			var values = [];
			$.each(data, function(index, propertyName) {
				values.push({ name: propertyName, value: "XXX"});
			});
			$('#globalProperties').DataTable().clear().rows.add(values).draw();
		});
	} // End of initGlobalProperties
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 *  
	 */
	function initSolutionsTab() {

// Define the structure and options of the solutions table
		var table = $('#solutions').DataTable({
			autoWidth: false,
			searching: false,
			scrollCollapse: false,
			paging: false,
			info: false,
			"columns": [
			   { data: "name",    title: "Solution Name" },
			   { data: "version", title: "Solution Version" },
			   {
				   data: "name",
				   title: "BOM",
				   render: function(data, type, row, meta) {
					   return "";
				   },
				   "createdCell": function(td, cellData, rowData, row, col) {
					   var b = $("<button>Load</button>").button().click(function(event) {
						   event.stopPropagation();
						   console.log("BOM Load requested!");
						   var row = $(this).data("row");
						   //debugger;
						   table.row(row).select();
						   //debugger;
						   $("#bomFileUpload").click();
					   }).data("row", row);
					   $(td).append(b);
				   }
			   }
			],
			select: 'single'
		}); // End of table definition for solution table.
		
		// Handle a selection change on the solutions table.  When a new solution is selected, we need to get the new list
		// of entity types that are available.  In addition, we need to enable the buttons that should only be active when
		// a solution has been selected.
		table.on('select', function(e, dt, type, indexes) {
			updateEntityTypes();
			$(".dsi_enableOnSolution").button("option", "disabled", false);
			$("#tabs").tabs("option", "disabled", []);
			$("#selectedSolutionLabel").text(getSelectedSolution().name);
			resetMapTab();
			var bomModel = getSolutionModel(getSelectedSolution().name);
			$("#bomLoadedLabel").text(bomModel!==null?"Yes":"No");
		}); // End of solution selection changed.
		
		table.on('deselect', function(e, dt, type, indexes) {
			$(".dsi_enableOnSolution").button("option", "disabled", true);
			$("#tabs").tabs("option", "disabled", [entitiesTabIndex, eventsTabIndex]);
			$("#selectedSolutionLabel").text("None");
			$("#bomLoadedLabel").text("Nonde");
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
	        "url": "/DSI_REST_Utils/xxx/myPath",
	        done: function (e, data) {
	        	var selectedSolution = getSelectedSolution();
	        	if (selectedSolution === null) {
	        		return;
	        	}
	        	setSolutionModel(selectedSolution.name, data.result);
	        	$("#bomLoadedLabel").text("Yes");
	        }
	    });
	    
	    // MUST BE LAST THING DONE IN INITIALIZATION
		$(".dsi_enableOnSolution").button("option", "disabled", true);
	} // End of initSolutionsTab
	
	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Initialize the entities tab.
	 */
	function initEntitiesTab() {
		var refreshEntities = function() {
			var solution = getSelectedSolution();
			if (solution === null) {
				return;
			}
			var selectedEntityType = getSelectedEntityType();
			var entityModel = getModelFromEntityType(selectedEntityType);
			if (entityModel !== null) {
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
				
				// Now that we have an array of columns, find the column that is the ID column and make that the
				// first column in the list.
				var id = entityModel["$IdAttrib"];
				$.each(columns, function(index, value){
					if (value.data == id) {
						// Swap column[index] and column[0]
						columns[index] = columns[0];
						columns[0] = value;
						return false;
					}
				});
				
				
				//$("#entitiesTable").DataTable("option", "columns", columns);
				$("#entitiesTable").remove();
				$("#entitiesTable_wrapper").remove();
				$("#entitiesTableDiv").append("<table id='entitiesTable'></table>");
				$("#entitiesTable").DataTable({
					autoWidth: false,
					searching: false,
					paging: true,
					info: false,
					"columns": columns,
					select: 'single'
				}); // End of #entitiesTable - DataTable constructor
			}
			
			// Ask DSI for the list of entities.
			DSIREST.listEntityInstances(solution.name, selectedEntityType).done(function(data){
				entitiesToTree(data);
				if (data !== null) {
					$("#entitiesTable").DataTable().rows.add(data.entities).draw();
				}
			});
		}; // End of refreshEntities()
		
		// Handle a request to get/refresh the list of entities.
		$("#getEntities").button().click(refreshEntities).width("7em");
		
		$("#entityTypesList").change(function(){
			console.log("Entities list changed!");
			$(".dsi_enableOnEntityType").button("option", "disabled", false);
		});
		
		// Handle a request to delete all the entities.
		$("#deleteAllEntities").button().click(function() {
			var solution = getSelectedSolution();
			if (solution === null) {
				return;
			}
			DSIREST.deleteAllEntities(solution.name, getSelectedEntityType());
			refreshEntities();
		}).width("7em");
		
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
					if (node.data === null || node.data.entityRoot !== true) {
						return null;
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
					}; // End of return list of items in the context menu
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
		$("#entitiesViewerTabSet").tabs();
	} // End of initEntitiesTab


	/**
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Initialize the Events tab.
	 */
	function initEventsTab() {
	
// Create the sendEvent button		
		$("#sendEvent").button({disabled: true});

// Define a handler to be invoked when the the sendEvent button is clicked.	
// Handle a request to send an event to DSI.
		$("#sendEvent").click(function() {
			// If there is no data, then nothing further to do.
			var eventData = $("#eventData").val().trim();
			if (eventData.length === 0) {
				return;
			}
			// Send the event to DSI.
			DSIREST.sendEvent(solutionToSimpleName(getSelectedSolution()), eventData).then(function() {
				// On success, save the event we just sent to the history of previously sent events.
				saveSendEvent(eventData);
			}, function(errorObj) {
				// On error
				showError(errorObj.responseJSON.message);
			});
		});
		
		// Disable the Send button if there is no input
		$("#eventData").on("input", function() {
			var enable = $("#eventData").val().trim().length>0?"enable":"disable";
			$("#sendEvent").button(enable);
			$("#eventSaveButton").button(enable);
		});
		
		// Create a confirm replace dialog.
	    $("#confirmReplace").dialog({
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Confirm replace",
	    	buttons: [{
	    		text: "Replace",
	    		click: function() {
	    			// When clicked, invoke the replace function
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
	    		var bomModel = getSolutionModel();
	    		if (bomModel === null) {
	    			return false;
	    		}

	    		var items = {};
	    		var itemCallback = function(itemKey, opt) {
	    			var selectedEvent = getEventByName(itemKey);
	    			var replaceFunction = function() {
	        			if (selectedEvent === null) {
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
	} // End of initEventsTab
	
	
	// The list of entities to display.  Each entry is an object of the form:
	// {
	//   entityType: <Entity type>
	//   property: <Property name of point>
	//   propertyType: <either "point" or "polygon">
	//   idName: <property name of id property>
	// }
	var mapEntitiesToDisplay = [];
	var mapPollingId;
	var mapMarkers = {};
	
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
			//height: "500px",
	        lat: 32.794,
	        lng: -97.042
		});
		
		$("#mapEntityTypes").change(function() {
			var selectedEntityType = $("#mapEntityTypes option:selected").val();
			var model = getModelFromEntityType(selectedEntityType);
			if (model === null) {
				return;
			}
			// Now .. let us see if this type contains a Point.  We do this by looking at each of the
			// the properties in the entity and ignore the system properties (those starting with "$")
			// and look for properties that are Points in space.
			var pointProperty = null;
			$.each(model, function(propertyName, value){
				if (!propertyName.startsWith("$") && value == "com.ibm.geolib.geom.Point") {
					pointProperty = propertyName;
					return false;
				}
			});
			if (pointProperty !== null) {
				mapEntitiesToDisplay.push({entityType: selectedEntityType, property: pointProperty, propertyType: "point", idName: model["$IdAttrib"] });
			}
		});
		
		$("#mapPollStart").button().click(function(){
			// If there is a timer already counting down, cancel it.
			if (mapPollingId !== null) {
				clearTimeout(mapPollingId);
			}
			var timeOutFunction = function() {
				mapPollingId = null;
				
				if (mapEntitiesToDisplay.length === 0) {
					return;
				}

				var solution = getSelectedSolution();
				if (solution === null) {
					return;
				}

				// Ask DSI for the list of entities.
				var geoProperty = mapEntitiesToDisplay[0].property;
				var idName      = mapEntitiesToDisplay[0].idName;
				var entityType  = mapEntitiesToDisplay[0].entityType;
				
// As we add markers to the map, we add them because there is an entity that contains a point that we wish to show.
// However, there is the circumstance that entities may be deleted/removed.  This would mean that we have markers
// remaining on the map even though there is no longer a corresponding entity in DSI.  For example, at time T1
// an entity E1 is created.  At time T2, it is placed on the map.  At time T3, the entity is deleted.  Now we 
// have the marker remaining on the map that was added at time T2.  This is no good.  Our solution is to create
// an object that has a flag for each of the previously drawn markers.  As we walk through each of our CURRENT
// existing entities, we remove that flag from our set.  At the end what remains in our marker set are the ones
// that were previously drawn but now no longer have corresponding entities.  These can now be removed from the
// map and forgotten about.

// We start by creating a marker set of ALL the previously drawn markers.				
				var clearMarkerSet = {};
				$.each(mapMarkers, function(propertyName) {
					clearMarkerSet[propertyName] = true;
				});
				
				DSIREST.listEntityInstances(solution.name, entityType).done(function(data){
					if (data !== null && data.entities !== null) {
						$.each(data.entities, function(index, value){
							if (value[geoProperty] === null) {
								return true;
							}
							var id       = value[idName];
							var markerId = entityType + ":" + id;
							var lat      = value[geoProperty].coordinates[1];
							var lng      = value[geoProperty].coordinates[0];
							
// At this point we now have an Entity that needs to be shown on the map. We have built some important variables
// including id (the id of the entity), markerId (a unique id for the marker), lat/lng (the position of the marker).
// We now check to see if we have PREVIOUSLY drawn a marker for this entity.  If we have NOT, then we create a
// new marker.  If we HAVE previously drawn a marker, then we update the position of that marker so that it
// appears at the new location.
	
							if (mapMarkers[markerId] === null) {
								var newMarker = gmap.addMarker({
									lat: lat,
									lng: lng,
									title: "XXX"
								});
								mapMarkers[markerId] = newMarker;
							} else {
								// we have an existing marker, so update its position
								var existingMarker = mapMarkers[markerId];
								existingMarker.setPosition(new google.maps.LatLng(lat, lng));
								delete clearMarkerSet[markerId];
							}
						}); // End of each of the data.entities
					}; // End of data != null

// We have now walked through all of our entities, this means that the entries in clearMarkerSet now need to be deleted.
					$.each(clearMarkerSet, function(markerId) {
						mapMarkers[markerId].setMap(null);
						delete mapMarkers[markerId];
					});
				});

// Determine how long it should be before we refresh and add a one shot timer to call ourselves back
				var timeout = Number($("#mapPollInterval").val());
				if (!isNaN(timeout)) {
					mapPollingId = setTimeout(timeOutFunction, timeout*1000);
				}
			}; // End of timeoutFunction
			
			timeOutFunction();
			$("#mapPollStop").button("enable");
			$("#mapPollStart").button("disable");
		}); // End of mapPollStart -> click
		
		$("#mapPollStop").button().click(function() {
			if (mapPollingId !== null) {
				clearTimeout(mapPollingId);
				mapPollingId = null;
			}
			$("#mapPollStop").button("disable");
			$("#mapPollStart").button("enable");
		}).button("disable");// End of mapPollStop -> click

	} // End of initMapTab
	
	
	/**
	 * @function
	 * @private
	 * @function
	 * @memberOf main
	 * @description
	 * Reset the map tab when something that will affect its state changes.
	 */
	function resetMapTab() {
		var selectedSolution = getSelectedSolution();
		if (selectedSolution === null) {
			return;
		}
		
		// Get the list of entity types from the server for the current solution.
		DSIREST.listEntityTypes(selectedSolution.name).done(function(entityTypes) {
			var listBox = $("#mapEntityTypes");
			listBox.empty();
			$.each(entityTypes.entityTypes, function(index, value) {
				listBox.append($("<option>", {value: value, text: value}));
			});
		});
	} // End of resetMapTab
	
	/**
	 * @private
	 * @function
	 * @memberOf main
	 * @description
	 * Initialize the logs tab.  There is a back-end tail server that is a responsible for sending us
	 * the tail data from the file being followed.  This server is a Web Socket based entity.  When
	 * connected, it expects a messaage of the form:
	 * {
	 *   fileName: <fileName> // The full path to the file to be tailed.
	 *   sendAll: <boolean>   // [Optional] - if true, then the initial content of the file will be sent.
	 *                        //  If omitted, then we assume a default of false.
	 * }
	 */
	function initLogsTab() {
	// Connect to the tail server 
	  var ws = null;
	  var doTail = function() {
        $("#tailScrollContainer").scrollTop($("#tailTable").height());
	  };
	  
	  var connect = function() {	
		  // Remove existing content
		  $("#tailTbody").empty();
		  let ws = new WebSocket("wss://" + window.location.hostname + ":3000");
		  ws.onopen = function() {
		    console.log("Connection opened!");
		    
		    let settings = getSettings();
		    options = {
		      fileName: settings.logFileName,
		      sendAll: true
		    };
		    ws.send(JSON.stringify(options));
		  };
		  
		  // Handle the arrival of a new message from the tail server which will be a line
		  // of data to add to the output.
		  ws.onmessage = function(messageEvent) {
		    // event.data = line
		    var tr = $("<tr>");
		    var td = $("<td>");
		    td.text(messageEvent.data);
		    tr.append(td);
		    $("#tailTbody").append(tr);
		    // If the UI says we are tailing, then tail.
		    if ($("#tailFollow").is(":checked")) {
		    	doTail();
		    }
		  }; // End of onMessage handler.
		  
		  ws.onclose = function(closeEvent) {
		    console.log("Web Socket closed! code=%d, reason=%s", closeEvent.code, closeEvent.reason);
		  };
		  
		  ws.onerror = function() {
		    console.log("Web Socket error!");
		  };
		  
		  return ws;
	  }
	  
	  // Handle the bottom button being pressed.
	  $("#tailBottom").button().click(function() {
	    doTail();
	  });
	  
	  // Handle the reconnect button being pressed.
	  $("#tailReconnect").button().click(function() {
		  if (ws !== null) {
			  ws.close();
		  }
		  ws = connect();
	  });
	  
	  // Handler the clear button being pressed.
	  $("#tailClear").button().click(function() {
		  $("#tailTbody").empty(); 
	  });
	} // End of initLogsTab
	
	
	/**
	 * @private
	 * @memberOf main
	 * @function
	 */
	function initAboutTab() {
	    $("#settingsDialog").dialog({
	    	autoOpen: false,
	    	modal: true,
	    	resizable: false,
	    	title: "Settings",
	    	width: "600px",
	    	buttons: [{
	    		text: "Save",
	    		click: function() {
	    			saveSettings({
	    				hostname: $("#hostnameSettings").val(),
    					port: $("#portSettings").val(),
    					logFileName: $("#logFileNameSettings").val()
	    			});
	    			$(this).dialog("close");
	    		}
	    	}, {
	    		text: "Cancel",
	    		click: function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    });
	    $("#settingsAbout").button().click(function() {
	    	let settings = getSettings();
	    	$("#hostnameSettings").val(settings.hostname);
	    	$("#portSettings").val(settings.port);
	    	$("#logFileNameSettings").val(settings.logFileName);
	    	$("#settingsDialog").dialog("open");
	    });
	    
	    // Clear local storage
	    $("#clearLocalStorageSettings").button().click(function() {
	    	localStorage.clear();
	    });
	}
	
	/**
	 * @private
	 * @memberOf main
	 */
	function initEventSaveLoad() {
		$("#eventHistory").button().click(function() {
			// Populate the table with the event history.  This history is available in the localStorage of the
			// browser under the key "sentHistory".  It is an array of objects where each object contains:
			// name
			// timestamp
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
			paging: true,
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
	    			if (savedEvent !== null) {
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
	    	"width": 600,
	    	"autoOpen": false,
	    	"modal": true,
	    	"resizable": false,
	    	"title": "Historic events",
	    	"buttons": [{
	    		"text": "Use",
	    		"click": function() {
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
	    		"text": "Clear",
	    		"click": function() {
	    			localStorage.setObject('sentHistory', []);
	    			$(this).dialog("close");
	    		}
	    	},
	    	{
	    		"text": "Cancel",
	    		"click": function() {
	    			$(this).dialog("close");
	    		}
	    	}]
	    }); // End of eventHistoryDialog
	    
// Initialize the event history table.  This table is used to show the set of events that have been
// previously sent.	    
		$('#eventHistoryTable').DataTable({
			"autoWidth": false,
			"searching": false,
			"paging": true,
			"info": false,
			"columns": [
			   { data: "name",    title: "Name" },
			   { data: "timestamp", title: "Date", render: function(data, type, row, meta) {
				   //debugger;
				   return new Date(data).toLocaleString();
			   }}
			],
			"order": [[1, "desc"]],
			"select": 'single'
		});
		
		function updateSavedEventsTable() {
			var savedEvents = localStorage.getObject("savedEvents");
			if (savedEvents === null || savedEvents.length === 0) {
				$("#loadEventDialog_Table").hide();
				$("#loadEventDialog_TableNoData").show();
			} else {
				$("#loadEventDialog_Table").show();
				$("#loadEventDialog_TableNoData").hide();
				$("#savedEventsTable").DataTable().clear().rows.add(savedEvents).draw();
			}
		}
	} // End of initEventSaveLoad
	
	/**
	 * @private
	 * @memberOf main
	 */
	function showError(message) {
		$("#errorMessage").text(message);
		$("#errorDialog").dialog("open");
	} // End of showError
	
	
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
			if (property === null) {
				return "<null>";
			}
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
	} // End of propertyToString
	
	/**
	 * Load BOM models from the localStorage.
	 * @private
	 * @memberOf main
	 * @description
	 * Load the BOM models from the browser local storage.  Each entry in the object is keyed by the
	 * solution name and contains two properties:
	 * <ul>
	 * <li><b>bomModel</b> - The bomModel object</li>
	 * <li><b>lastUpdated</b> - The time when the object was last updated</li>
	 * </ul>
	 */	
	function loadBOMModels() {
		var textData = localStorage.getItem("bomModels");
		if (textData !== null) {
			bomModels = JSON.parse(textData);
		}
		return;
	} // End of loadBOMModles

	/**
	 * Save BOM models to the localStorage.
	 * @private
	 * @memberOf main
	 * @description
	 * Save the BOM models to the browser local storage.  Each entry in the object is keyed by the
	 * solution name and contains two properties:
	 * <ul>
	 * <li><b>bomModel</b> - The bomModel object</li>
	 * <li><b>lastUpdated</b> - The time when the object was last updated</li>
	 * </ul>
	 */	
	function saveBOMModels() {
		localStorage.setItem("bomModels", JSON.stringify(bomModels));
	} // End of saveBOMModels


	/**
	 * Get the BOM model for a given solution.
	 * @function 
	 * @private
	 * @memberOf main
	 * @description
	 * Get the BOM model for the solution or the currently selected solution.
	 */
	function getSolutionModel(solutionName) {
		if (solutionName === null) {
			var solution = getSelectedSolution();
			if (solution === null) {
				return null;
			}
			solutionName = solution.name
		}
		var bomModel = bomModels[solutionName]; // This may be null
		if (bomModel === null) {
			return null;
		}
		return bomModel.bomModel;
	} // End of getSolutionModel

	
	/**
	 * Set the BOM model for the given solution.
	 * @function
	 * @private
	 * @memberOf main
	 * @description
	 * Set the BOM model for the given solution.
	 */
	function setSolutionModel(solutionName, model) {
		bomModels[solutionName] = {bomModel: model, lastUpdated: new Date()};
		saveBOMModels();
	} // End of setSolutionModel
	
	/**
	 * @module main
	 * @function
	 * @private 
	 */
	function getSettings() {
		let settings = localStorage.getObject("settings");
		if (settings === null) {
			settings = {
				hostname: "localhost",
				port: 9443,
				logFileName: "C:/IBM/ODMInsights88/runtime/wlp/usr/servers/cisDev/logs/messages.log"
			};
		}
		return settings;
	}
	
	/**
	 * @module main
	 * @function
	 * @private 
	 * @param settings
	 */
	function saveSettings(settings) {
		localStorage.setObject("settings", settings);
	}
	
	refreshSolutions();
}); // End of on load