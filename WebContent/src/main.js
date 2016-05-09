/**
 * @module foobar
 */

/**
 * The table widget used in the project is dataTables (https://datatables.net/)
 * The file loader widget used in the project is (https://blueimp.github.io/jQuery-File-Upload/)
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
	var bomModel = null;
	
	$('body').layout();
	
	document.oncontextmenu = function() {return false;};
	
	$("#tabs").tabs({disabled: [ entitiesTabIndex, eventsTabIndex]});

	
	var table = $('#solutions').DataTable({
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
	
	var globalPropertiesTable = $('#globalProperties').DataTable({
		"columns": [
		   { data: "name",  title: "Name" },
		   { data: "value", title: "Value" }
		],
		select: 'single'
	});
	
	$("#stop").button().click(function() {
		console.log("Stop! - selected: " + table.rows({selected: true}).count());
		table.rows({selected: true}).every(function() {
			console.log("Stopping: %O", this.data());
			DSIJMX.stopSolution(this.data().name, function() {
				refresh();
			});
		});
	}); // End of stop button

	
	$("#activate").button().click(function() {
		console.log("Activate! - selected: " + table.rows({selected: true}).count());
		table.rows({selected: true}).every(function() {
			console.log("Activating: %O", this.data());
			DSIJMX.activateSolution(this.data().name+"-0.0", function() {
				refresh();
			});
		});
	}); // End of activate button

	
	$("#undeploy").button().click(function() {
		console.log("Undeploy! - selected: " + table.rows({selected: true}).count());
		table.rows({selected: true}).every(function() {
			console.log("Undeploying: %O", this.data());
			DSIJMX.undeploySolution(this.data().name + "-0.0", function() {
				refresh();
			});
		});
	});
	
	$("#sendEvent").button();
	// Handle a request to send an event to DSI.
	$("#sendEvent").click(function() {
		var eventData = $("#eventData").val();
		// At this point, eventData is a JSON string representing the event data. We need to make an XML document of this.
		DSIREST.sendEvent(solutionToSimpleName(getSelectedSolution()), eventData);
	});
	
	$("#entityTypes").selectmenu();
	
	$("#getEntities").button().click(function() {
		var solution = getSelectedSolution();
		if (solution == null) {
			return;
		}
		var selectedEntityType = getSelectedEntityType();
		DSIREST.listEntityInstances(solution.name, selectedEntityType).done(function(data){
			entitiesToTree(data);
		});
	});
	
	$("#refresh").button().click(function() {
		refresh();
	});
	
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
	});
	
	$(".dsi_enableOnSolution").button("option", "disabled", true);
	
    $('#fileupload').fileupload({
        dataType: 'json',
        done: function (e, data) {
        	bomModel = data.result;
        	console.log("Parsed Bom: %O", bomModel);
        	$("#bomLoadedLabel").text("Yes");
        }
    });
    
    /*
    $.contextMenu({
    	selector: "#eventData",
    	items: {
    		foo: {
    			name: "Insert Event",
    			callback: function(key, opt) {
    				//alert("Foo!");
    				console.log("Insert BOM %O", bomModel);
    				$("#eventData").val(JSON.stringify(bomModel.events[0], null, 2));
    			}
    		},
    		bar: {
    			name: "Bar",
    			callback: function(key, opt) {
    				// alert();
    			}
    		}
    	}
    });
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
    			if (selectedEvent == null) {
    				return;
    			}
    			$("#eventData").val(JSON.stringify(selectedEvent, null, 2));
    		};
    		
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
    });
	
	DSIJMX.listGlobalProperties(function(data) {
		var values = [];
		$.each(data, function(index, propertyName) {
			values.push({ name: propertyName, value: "XXX"});
		});
		globalPropertiesTable.clear().rows.add(values).draw();
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
					text:  name + ": " + propertyValue,
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
	 * @private
	 * @memberOf main
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
	 * @private
	 * @memberOf main
	 */
	function refresh() {
		DSIJMX.getSolutions(function(solutions) {
			console.log("Solns=%O", solutions);
			table.clear().rows.add(solutions).draw();
		});
	}; // End of refresh
	
	/**
	 * @private
	 * @memberOf main
	 */
	function getSelectedSolution() {
		var selectedRows = table.rows({selected: true});
		if (selectedRows.count() != 1) {
			return null;
		}
		
		var selectedSolution;
		selectedRows.every(function() {
			selectedSolution = this.data();
		})
		return selectedSolution;
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
	 * @private
	 * @memberOf main
	 */
	function getSelectedEntityType() {
		return $("#entityTypes").val();
	}; // End of getSelectedEntityTypes
	
	/**
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
	
	refresh();
}); // End of on load