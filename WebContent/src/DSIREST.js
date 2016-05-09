// Make the baseURL a private variable to the REST environment
var DSIREST = (function(){
	var baseURL = "https://localhost:9449";
	// Userid and Password pair
	var credentials = null;
	
	function _doRESTActual(command, url, data, deferred) {
		var options = {
			type : command,
			url : baseURL + url,
			data : data,
			dataType: "json",
			context : this,
			success : function(data) {
				deferred.resolve(data);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				deferred.reject({
					status: jqXHR.status,
					statusText: jqXHR.statusText
				});
			} // End of Error
		};
		if (credentials && credentials.userid && credentials.password) {
			options.headers = {
				"Authorization" : "Basic " + $.base64.btoa(credentials.userid + ":" + credentials.password)
			};
		}
		$.ajax(options); // End of $.ajax
	}; // End of _doRESTActual
	
	function _JSON2XML(eventJSON) {
		var event = JSON.parse(eventJSON);
		var eventName = event["$Name"].split(".")[1];
		var eventXML = "<?xml version='1.0' encoding='UTF-8'?>" +
		"<m:" + eventName + " xmlns:m='" + event["$Namespace"] + "' " +
		"xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'>";
		$.each(event, function(propertyName, propertyValue) {
			if (!propertyName.startsWith("$")) {
				eventXML += "<m:" + propertyName + ">" + propertyValue + "</m:" + propertyName + ">";
			}
		});
		eventXML += "</m:" + eventName + ">";
		return eventXML;
	}; // End of _JSON2XML

	return {

		/**
		 * @private
		 */
		_doGET : function(url, data) {
			return this._doREST("GET", url, data);
		},// End of _doGET
		
		/**
		 * @private
		 */
		_doPOST : function(url, options) {
			if (options != null) {
				url += "?" + $.param(options)
			}
			return this._doREST("POST", url, null);
		}, // End of _doPOST
		
		/**
		 * @private
		 */
		_doPUT : function(url, data) {
			return this._doREST("PUT", url, data);
		}, // End of _doPUT
		
		/**
		 * @private
		 */
		_doDELETE : function(url, data) {
			return this._doREST("DELETE", url, data);
		}, // End of _doDELETE
		
		/**
		 * @private
		 */
		_doREST : function(command, url, data) {
			var deferred = jQuery.Deferred();
			_doRESTActual(command, url, data, deferred);
			return deferred;
		}, // End of _doREST
		
		/**
		 * @public
		 */
		deleteEntity: function(solutionName, entityType, entityId) {
			return this._doDELETE("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities/" + entityId);
		},
		
		/**
		 * @public
		 */
		getEntity: function(solutionName, entityType, entityId) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities/" + entityId);
		}, // End of getEntity
		
		listEntityInstances: function(solutionName, entityType) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities");
		}, // End of listEntityInstances
		
		listEntityTypes: function(solutionName) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/entity-types");
		},
		
		/**
		 * @name DSIREST#listSolutions
		 * @returns
		 */
		listSolutions: function() {
			return this._doGET("/ibm/ia/rest/solutions");
		}, // End of listSolutions
		
		/**
		 * @name DSIREST#setBaseURL
		 * @function
		 * @public
		 * @description
		 * @memberOf dsi.DSIREST
		 * Change/set the base URL for DSI access.  The base URL is a package global.
		 */
		setBaseURL : function(newBaseURL) {
			baseURL = newBaseURL;
		}, // End of setBaseURL
		
		/**
		 * @name DSIREST#setCredentials
		 * @function
		 * @public
		 * @description
		 * Set the credentials for authentication.
		 */
		setCredentials : function(userid, password) {
			credentials = {
				userid : userid,
				password : password
			};
		}, // End of setCredentials
		
		/**
		 * @name DSIREST#sendEvent
		 * @description
		 * Send an event to DSI.
		 * @function
		 * @param solution
		 * @param event
		 * @returns
		 */
		sendEvent: function(solution, event) {
			debugger;
			var xmlEvent = _JSON2XML(event);
			return this._doPOST("/ibm/ia/gateway/" + solution, null, xmlEvent);
		} // End of sendEvent
	};
})();
