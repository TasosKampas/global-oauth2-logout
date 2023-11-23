/**
 * Node imports
 */
var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    org.forgerock.http.protocol.Request,
    org.forgerock.http.protocol.Response
);

/**
 * Node outcomes
 */
var nodeOutcomes = {
    TRUE: "true",
    ERROR: "error"
};

/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***OAuth2RevokeScript",
  	cookieName: "iPlanetDirectoryPro",
  	AM_URI: "http://anastasios-kampas-am-dihcahr.test:8080/openam",
  	realmPath: "realms/root/realms/machine2machine"
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
 * @param admin - the admin username
 * @param password - the admin password
 * @returns an admin token
 */

function getAdminToken() {
    nodeLogger.error("Authenticating as administrator");
  	var admin = "amadmin";
  	var pass = "cangetinam";
    var restBody = "{}";
    var authEndpoint = nodeConfig.Fqdn + "/json/realms/root/authenticate";
    try {
        var request = new org.forgerock.http.protocol.Request();
        request.setMethod('POST');
        request.setUri(authEndpoint);
        request.getHeaders().add("X-OpenAM-Username", admin);
        request.getHeaders().add("X-OpenAM-Password", pass);
        request.getHeaders().add("content-type", "application/json");
        request.getHeaders().add("Accept-API-Version", "resource=2.0, protocol=1.0");
        request.getEntity().setString(restBody);
        var response = httpClient.send(request).get();
        var jsonResult = JSON.parse(response.getEntity().getString());
        nodeLogger.error("Returning admin token " + jsonResult.tokenId);
        return jsonResult.tokenId;
    } catch (e) {
        nodeLogger.error("Failure to call the AM authenticate endpoint");
        nodeLogger.error("Exception: " + e);
        return null;
    }
}

/**
 * Returns authenticates as admin and returns the SSO token. 
 * @param adminToken - the admin token Id
 * @param user - the user Id
 * @returns a map with the authorized clients
 */

function retrieveUserAuthorizedClients(adminToken, user) {
    nodeLogger.error("Retrieving authorized clients");
    var response;
    var usersEndpoint = nodeConfig.AM_URI + "/json/" + nodeConfig.realmPath + "/users/" + user + "/oauth2/applications?_queryFilter=true";
  	nodeLogger.error("Calling: " + usersEndpoint + " with admin token " + adminToken);
    try {
        var request = new org.forgerock.http.protocol.Request();
        request.setUri(usersEndpoint);
        request.setMethod("GET");
        request.getHeaders().add("Content-Type", "application/json");
      	request.getHeaders().add("Accept-API-Version", "resource=1.1");
        request.getHeaders().add(nodeConfig.cookieName, adminToken);
        response = httpClient.send(request).get();
    } catch (e) {
        nodeLogger.error("Failure to call the AM endpoint");
        nodeLogger.error("Exception: " + e);
        return null;
    }
  	nodeLogger.error("The response was: " + response.getEntity().getString());
    if (!(response.getStatus().getCode() == 200)) {
        nodeLogger.error("Didn't get a 200 OK from user's authorized clients endpoint");
        return null;
    }

    var jsonResponse = JSON.parse(response.getEntity().getString());
    nodeLogger.debug("Got 200 OK. Authorized clients count: " + jsonResponse.resultCount);
    if (!(jsonResponse.resultCount != 0)) {
        nodeLogger.debug("Result count is not zero.");
        return null;
    }
  	nodeLogger.debug("Collect authorized clients.");
    var authorizedClients = [];
    for (var i = 0; i < jsonResponse.result.length; i++) {
        var clientId = jsonResponse.result[i]._id;
        nodeLogger.debug("Found authorized client " + clientId);
        authorizedClients.push(clientId);
    };
    nodeLogger.debug("Returning authorized clients.");
    return authorizedClients;
}

/**
 * Revokes all OAuth2 tokens per authorized client
 * @param adminToken - the admin token Id
 * @param user - the user Id
 * @param authorizedClients - the authorized clients
 * @returns true or null
 */

function revokeUserAuthorizedClients(adminToken, user, authorizedClients) {

    nodeLogger.error("Revoking authorized clients");
    var response;
    try {
        authorizedClients.forEach(function(clientId) {
            var usersEndpoint = nodeConfig.AM_URI + "/json/" + nodeConfig.realmPath + "/users/" + user + "/oauth2/applications/" + clientId;
            var request = new org.forgerock.http.protocol.Request();
            request.setUri(usersEndpoint);
            request.setMethod("DELETE");
            request.getHeaders().add("Content-Type", "application/json");
          	request.getHeaders().add("Accept-API-Version", "resource=1.1");
            request.getHeaders().add(nodeConfig.cookieName, adminToken);
            nodeLogger.error("Attempting to delete tokens from client " + clientId);
            response = httpClient.send(request).get();
            if (response.getStatus().getCode() == 200) {
                nodeLogger.error("the client " + clientId + " tokens have been revoked")
            } else {
                nodeLogger.error("Failed to revoke tukens for " + clientId)
            }
        });
    } catch (e) {
        nodeLogger.error("Failure to call the endpoint");
        nodeLogger.error("Exception: " + e);
        return false;
    }
    return true;
}


/**
 * Node entry point
 */


(function() {
    nodeLogger.error("node executing");
    var user = sharedState.get("username");
  	if (!(user)) {
  		nodeLogger.error("Couldn't get the username from the Tree state.");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).build();
        return;
    }
	nodeLogger.error("The user is " + user);
  
    // Step1 get an admin token 
    var adminToken = getAdminToken();
    if (!(adminToken)) {
        nodeLogger.error("Couldn't get an admin token. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).build();
        return;
    }
    // Step2: Get all Authorized clients (if any)
    var authorizedClients = retrieveUserAuthorizedClients(adminToken, user);
    if (!(authorizedClients)) {
        nodeLogger.error("Couldn't get the authorized clients. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).build();
        return;
    }

    // Step3: Revoke all Authorized clients
    var revokeOutcome = revokeUserAuthorizedClients(adminToken, user, authorizedClients);
    if (!(revokeOutcome)) {
        nodeLogger.error("Couldn't revoke the authorized clients. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).build();
        return;
    } else {
        nodeLogger.error("OAuth2 Logout was successful");
        action = javaImports.Action.goTo(nodeOutcomes.TRUE).build();
    }
})();