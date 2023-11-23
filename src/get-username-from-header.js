/**
 * Node imports
 */
var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
);

/**
 * Node outcomes
 */
var nodeOutcomes = {
    TRUE: "true",
    FALSE: "false"
};

/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***get-username-from-header",
  	usernameHeader: "X-OpenAM-Username"
};

/**
 * Node logger
 */

var nodeLogger = {
    debug: function(message) {
        logger.message("***" + nodeConfig.nodeName + " " + message);
    },
    warning: function(message) {
        logger.warning("***" + nodeConfig.nodeName + " " + message);
    },
    error: function(message) {
        logger.error("***" + nodeConfig.nodeName + " " + message);
    }
};



/**
 * Returns authenticates as admin and returns the SSO token. 
 * @param headerName - the header name
 * @returns header value
 */

function getHeader(headerName) {
  var header = requestHeaders.get(headerName);
  if (header === null) {
    return null;
  }
  return String(header.get(0));
}

/**
 * Node entry point
 */


(function() {
    nodeLogger.error("node executing");
  	var userId = getHeader(nodeConfig.usernameHeader);
  	if (!(userId)) {
        nodeLogger.error("Couldn't get username from header");
        action = javaImports.Action.goTo(nodeOutcomes.FALSE).build();
        return;
    } else {
       nodeLogger.error("UserId retrieved. Updating Tree state with username: " + userId);
       sharedState.put("username", userId);
       action = javaImports.Action.goTo(nodeOutcomes.TRUE).build();
    }
})();