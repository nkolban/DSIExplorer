/**
 * 
 */
// schema - an array of fields.
// field - an object describing a field:
// {
//   name: <Name of the field>
//   label: <label of the field>
//   type: <type of the field>
// }
var FormBuilder = function() {
	function newForm(parentJQ, schema) {
		$.each(schema, function(index, field) {
			var labelJQ = $("<label>").text(field.label);
			var fieldJQ = null;
			switch(field.type) {
			
			case "string":
			case "integer":
				fieldJQ = $("<input type='text'>");
				break;
				
			case "object":
				fieldJQ = $("<div>").css("margin-left: 10px;");
				newForm(fieldJQ, field.children);
				break;
				
			default:
				console.log("Don't know how to build a field for: " + field.type);
				break;
			}
			
			
			$(parentJQ).append(labelJQ);
			if (fieldJQ != null) {
				$(parentJQ).append(fieldJQ);
			}
		});
	}
	
	return {
		newForm: newForm
	};
}();