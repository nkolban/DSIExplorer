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
	} // End of _doRESTActual

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
			return this._doREST("POST", url + "?" + $.param(options), null);
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
		_doREST : function(command, url, data) {
			var deferred = jQuery.Deferred();
			_doRESTActual(command, url, data, deferred);
			return deferred;
		}, // End of _doREST
		
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
		
		listSolutions: function() {
			return this._doGET("/ibm/ia/rest/solutions");
		}, // End of listSolutions
		
		/**
		 * @name dsi.DSIREST#setBaseURL
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
		 * @name dsi.DSIREST#setCredentials
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
		} // End of setCredentials			
	};
})();
