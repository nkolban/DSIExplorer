// Make the baseURL a private variable to the REST environment
var DSIREST = (function(){
	var baseURL = "https://localhost:9449";
	// Userid and Password pair
	var credentials = null;
	
	function _doRESTActual(command, url, data, deferred) {
		var options = {
			type : command,
			url : baseURL + url,
			dataType: "json",
			context : this,
			success : function(data) {
				deferred.resolve(data);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				deferred.reject({
					status: jqXHR.status,
					statusText: jqXHR.statusText,
					responseJSON: jqXHR.responseJSON 
				});
			} // End of Error
		};
		// Handle any passed data.  It may be either, null, a string or an object.  If an object then that object will
		// be of the format:
		// {
		//   data: <The data to send>,
		//   contentType: <The MINE content type> (eg. application/json or application/xml)
		// }
		if (data != null) {
			if (typeof data == "object") {
				options.data = data.data;
				options.contentType = data.contentType;
			} else {
				options.data = data;
			}
		}
		if (credentials && credentials.userid && credentials.password) {
			options.headers = {
				"Authorization" : "Basic " + $.base64.btoa(credentials.userid + ":" + credentials.password)
			};
		}
		$.ajax(options); // End of $.ajax
	}; // End of _doRESTActual
	
	/**
	 * @private
	 * @function
	 * @module DSIREST
	 * @description
	 * Convert a DSI Event JSON String to an XML String. Some of the rules followed by this
	 * conversion are:
	 * <ul>
	 * <li>Property names that start with "$" are not included in the output.</li>
	 * <li>$Name is a special property that is the eventName.</li>
	 * <li>$Namespace is a special property that is the namespace of the event.</li>
	 * </ul>
	 */
	function _OBJECT2XML(event) {
//
// NOTE: Consider re-implementing this with XMLSerializer
//
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
	}; // End of _OBJECT2XML


	// Return the object that is DSIREST
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
		_doPOST : function(url, options, data) {
			if (options != null) {
				url += "?" + $.param(options)
			}
			return this._doREST("POST", url, data);
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
		deleteAllEntities: function(solutionName, entityType) {
			return this._doDELETE("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities");
		},
		
		/**
		 * @public
		 */
		getEntity: function(solutionName, entityType, entityId) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities/" + entityId);
		}, // End of getEntity  
		
		/**
		 * @public
		 * @description
		 * Ask DSI for a list of the entities for a given solution/entity type pair.  An object is returned that has the
		 * following structure:
		 * <ul>
		 * <li><b>$class</b> - The type of the entities of the form Collection[entityType]
		 * <li><b>entities</b> - An array of entities where each each entity is of the form:
		 * <ul>
		 * <li><b>$IdAttrib</b> - The property name that is the id of the entity.</li>
		 * <li><b>$class</b> - The type of the entity.</li>
		 * <li><b>$CreationTime</b> - </li>
		 * <li><b> ... properties ... </b> - The individual properties of the entity.
		 * </ul>
		 * </ul>
		 */
		listEntityInstances: function(solutionName, entityType) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/entity-types/" + entityType + "/entities");
		}, // End of listEntityInstances
		
		/**
		 * @public
		 */
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
		 * @name DSIREST#listAggregates
		 * @returns
		 */
		listAggregates: function(solutionName) {
			return this._doGET("/ibm/ia/rest/solutions/" + solutionName + "/aggregate");
		},
		
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
		 * Send an event to DSI.  The input is a JSON string that encodes the event to be sent.
		 * The actual event payload is an XML string.
		 * @function
		 * @param solution - The name of the solution to which this event will be sent.
		 * @param event - A JSON string that represents the event to be sent.
		 * @returns
		 */
		sendEvent: function(solution, eventJSON) {
			var that = this;
			var event = JSON.parse(eventJSON);
			if (Array.isArray(event)) {
				let defItems = [];
				$.each(event, function(index, item){
					var xmlEvent = {
						data: _OBJECT2XML(item),
						contentType: "application/xml"
					};
					defItems.push(that._doPOST("/ibm/ia/gateway/" + solution, null, xmlEvent));
				});
				return $.when.apply($, defItems);
			} else {
				let xmlEvent = {
					data: _OBJECT2XML(event),
					contentType: "application/xml"
				};
				return this._doPOST("/ibm/ia/gateway/" + solution, null, xmlEvent);
			}
		} // End of sendEvent
	};
})();
