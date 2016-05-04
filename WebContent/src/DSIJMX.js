/**
 * http://usejsdoc.org/
 */
var DSIJMX = (function() {
	function doJMX(path, callback, method, payload) {
		if (method == null) {
			method = "GET";
		}
		$.ajax({
			method: method,
			data: payload,
			contentType: "application/json",
			username: "tester",
			password: "tester",
			url: "https://localhost:9449" + path,
			success: function(data) {
				callback(data);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debugger;
			}
		});
	}; // End of doJMX
	
	function toRESTJMXPayload(parameters) {
		var ret = {
			params: [],
			signature: []
		};
		$.each(parameters, function(index, parameter) {
			if (parameter.type === "String") {
				parameter.type = "java.lang.String";
			}
			ret.params.push(parameter);
			ret.signature.push(parameter.type);
		});
		return JSON.stringify(ret);
	}; // End of toRESTJMXPayload
	
	var module = {
		getSolutions: function(callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/attributes?attribute=Solutions", function(data){
				var results = [];
				var solnArray = data[0].value.value;
				$.each(solnArray, function(index, value) {
					results.push({name: value.name, version: value.currentVersion});
				});
				if (callback != null) {
					callback(results);
				}
			});
		}, // End of getSolutions
		
		stopSolution: function(solutionName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/operations/stopSolution", function(data) {
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: solutionName }]));
		}, // End of stopSolution
		
		activateSolution: function(solutionName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/operations/activateSolution", function(data) {
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: solutionName }]));
		}, // End of activateSolution
		
		revertSolution: function(solutionName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/operations/revertSolution", function(data) {
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: solutionName }]));
		}, // End of revertSolution
		
		undeploySolution: function(solutionName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/operations/undeploySolution", function(data) {
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: solutionName }]));
		} // End of undeploySolution
	};
	return module;
})();