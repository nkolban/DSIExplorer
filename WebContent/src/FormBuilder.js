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
			var labelJQ = $("<label>").text(field.label).css({"margin-right": "1em"});
			var fieldJQ = null;
			switch(field.type) {
			
			case "string":
			case "integer":
				fieldJQ = $("<input type='text'>");
				break;
			
			case "datetime":
				fieldJQ = $("<input type='datetime-local' step=1>");
				break;
				
			case "object":
				fieldJQ = $("<div>").css({"margin-left": "10px"});
				newForm(fieldJQ, field.children);
				break;
				
			default:
				console.log("Don't know how to build a field for: " + field.type);
				break;
			}
			
			var d1 = $("<div>").css({"margin-top": "0.5em"});
			$(d1).append(labelJQ);
			if (fieldJQ != null) {
				$(d1).append(fieldJQ);
			}
			$(parentJQ).append(d1);
		});
	}
	
	return {
		newForm: newForm
	};
}();