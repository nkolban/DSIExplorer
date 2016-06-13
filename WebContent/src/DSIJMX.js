var DSIJMX = (function() {
	var baseUrl = window.location.protocol + "//" + window.location.host;
	var username = "tester";
	var password = "tester";
	/**
	 * @private
	 */
	function doJMX(path, callback, method, payload) {
		if (method == null) {
			method = "GET";
		}
		$.ajax({
			method: method,
			data: payload,
			contentType: "application/json",
			username: username,
			password: password,
			url: baseUrl + path,
			success: function(data) {
				callback(data);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debugger;
			}
		});
	}; // End of doJMX
	
	/**
	 * Create a REST payload for JMX 
	 * @private
	 * @memberOf dsi.DSIJMX
	 * @param parameters
	 * @description 
	 */
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
	
	return {
		/**
		 * @name DSIJMX#getSolutions
		 * @function
		 * @public
		 * @memberOf dsi.DSIJMX
		 * @description
		 */
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
		
		/**
		 * @name DSIJMX#stopSolution
		 * @function
		 * @public
		 * @memberOf dsi.DSIJMX
		 * @description
		 */
		stopSolution: function(solutionName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DSolutions/operations/stopSolution", function(data) {
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: solutionName }]));
		}, // End of stopSolution
		
		/**
		 * @name DSIJMX#activateSolution
		 * @function
		 * @public
		 * @memberOf dsi.DSIJMX
		 * @description
		 */
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
		}, // End of undeploySolution
		
		/**
		 * @name DSIJMX#listGlobalProperties
		 * @function
		 * @public
		 * @description
		 * @memberOf dsi.DSIJMX
		 * @param {function} callback - The function to be called back.
		 * Get a list of global properties.  The result is a JavaScript array where
		 * each member of the array is the name of a property.
		 * See: https://www.ibm.com/support/knowledgecenter/SSQP76_8.8.0/com.ibm.odm.itoa.ref/html/api/html/com/ibm/ia/runtime/management/GlobalPropertiesMXBean.html
		 */
		listGlobalProperties: function(callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DGlobalProperties/operations/listProperties", function(data) {
				if (callback != null) {
					callback(data.value);
				}
			}, "POST", toRESTJMXPayload([]));
		}, // End of listGlobalProperties
		
		
		/**
		 * @name DSIJMX#getGlobalProperty
		 * @function
		 * @public
		 * @memberOf dsi.DSIJMX
		 * @description
		 * Get a specific named global property.
		 */
		getGlobalProperty: function(propertyName, callback) {
			doJMX("/IBMJMXConnectorREST/mbeans/com.ibm.ia%3Atype%3DGlobalProperties/operations/getProperty", function(data) {
				debugger;
				if (callback != null) {
					callback();
				}
			}, "POST", toRESTJMXPayload([{ type: "String", value: propertyName }]));
		} // End of getGlobalProperty
	};
})();