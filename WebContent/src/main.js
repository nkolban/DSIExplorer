$(function() {
	// Do something here
	document.oncontextmenu = function() {return false;};
	
	$("#tabs").tabs();

	
	var table = $('#solutions').DataTable({
		"columns": [
		   { data: "name",    title: "Solution Name" },
		   { data: "version", title: "Solution Version" }
		],
		select: 'single'
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
	});
	
	$("#activate").button().click(function() {
		console.log("Activate! - selected: " + table.rows({selected: true}).count());
		table.rows({selected: true}).every(function() {
			console.log("Activating: %O", this.data());
			DSIJMX.activateSolution(this.data().name+"-0.0", function() {
				refresh();
			});
		});
	});
	
	$("#undeploy").button().click(function() {
		console.log("Undeploy! - selected: " + table.rows({selected: true}).count());
		table.rows({selected: true}).every(function() {
			console.log("Undeploying: %O", this.data());
			DSIJMX.undeploySolution(this.data().name + "-0.0", function() {
				refresh();
			});
		});
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
	
	// Handle a selection change on the solutions table.  When a new solution is selected, we need to get the new list
	// of entity types that are available.  In addition, we need to enable the buttons that should only be active when
	// a solution has been selected.
	table.on('select', function(e, dt, type, indexes) {
		console.log("Selection changed!");
		var data = dt.row(indexes[0]).data();
		updateEntityTypes();
		$(".dsi_enableOnSolution").button("option", "disabled", false);
	}); // End of solution selection changed.
	
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
						label: "refresh",
						action: function(data) {
		                    var inst = $.jstree.reference(data.reference);
	                        var node = inst.get_node(data.reference);
	                        var selectedSolution = getSelectedSolution();
	                        var selectedEntityType = getSelectedEntityType();
	                        var entityId = node.data.id;
	                        console.log("Time to refresh entity with id: " + entityId + " from solution " + selectedSolution.name + " of type " + selectedEntityType);
	                        DSIREST.getEntity(selectedSolution.name, selectedEntityType, entityId).done(function(data){
	                        	debugger;
	                        });
						} // End of the refresh item action
					}, // End of the refresh item
					
// Add a delete button that will delete the underlying entity in DSI.					
					"delete": {
						label: "delete",
						action: function(data) {
		                    var inst = $.jstree.reference(data.reference);
	                        var node = inst.get_node(data.reference);
	                        var selectedSolution = getSelectedSolution();
	                        var selectedEntityType = getSelectedEntityType();
	                        var entityId = node.data.id;
	                        console.log("Time to delete entity with id: " + entityId + " from solution " + selectedSolution.name + " of type " + selectedEntityType);
	                        DSIREST.deleteEntity(selectedSolution.name, selectedEntityType, entityId).done(function(data){
	                        	debugger;
	                        });
						} // End of the delete item action
					} // End of the delete item
				} // End of return list of items in the context menu
			} // End of items in the context menu
		}, // End of context menu definitions
		plugins: ["contextmenu"]
	});
	
	$(".dsi_enableOnSolution").button("option", "disabled", true);
	
	DSIJMX.listGlobalProperties(function(data) {
		var values = [];
		$.each(data, function(index, propertyName) {
			values.push({ name: propertyName, value: "XXX"});
		});
		globalPropertiesTable.clear().rows.add(values).draw();
	});
	
	/**
	 * @description
	 * Add the entities to a jsTree
	 */
	function entitiesToTree(entities) {
		var treeNodes = [];
		// Iterate over each of the entities
		$.each(entities.entities, function(index, value){
			var entityRootNode = {
				text: value[value["$IdAttrib"]],
				state: {opened: false},
				children: [],
				data: {
					id: value[value["$IdAttrib"]],
					entityRoot: true
				}
			};
			// Iterate over each of the members of the current entity.
			$.each(value, function(name, propertyValue) {
				if (!name.startsWith("$")) {
					entityRootNode.children.push({
						text: name + " = " + propertyValue,
						state: {opened: true}
					});
				}
			}); // End of iteration over each of the members of the current entity
			treeNodes.push(entityRootNode);
		}); // End of iteration over each of the entities

		$("#entitiesTree").jstree(true).settings.core.data = treeNodes;
		$("#entitiesTree").jstree(true).refresh();
	}; // End of entitiesToTree

	
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
	
	
	function refresh() {
		DSIJMX.getSolutions(function(solutions) {
			console.log("Solns=%O", solutions);
			table.clear().rows.add(solutions).draw();
		});
	}; // End of refresh
	
	function getSelectedSolution() {
		selectedRows = table.rows({selected: true});
		if (selectedRows.count() != 1) {
			return null;
		}
		
		var selectedSolution;
		selectedRows.every(function() {
			selectedSolution = this.data();
		})
		return selectedSolution;
	}; // End of getSelectedSolution
	
	function getSelectedEntityType() {
		return $("#entityTypes").val();
	}; // End of getSelectedEntityTypes
	
	refresh();
}); // End of on load