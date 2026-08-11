function UnityUrlFix(url) {
	console.log("--fx--UnityUrlFix--", url);
	// Offline local-sink guard: any request aimed at the compiled Unity
	// IAP/analytics SDKs (unity3d.com, appspot.com) or at the retained
	// Kongregate SDK's network endpoints (api.swrve.com analytics batch,
	// kongregate.com API/config hosts) is routed to a local empty response
	// so nothing leaves this origin while offline.
	if (typeof url === "string" && /(unity3d\.com|appspot\.com|swrve\.com|kongregate\.com)/i.test(url)) {
		url = "json/null.json?"+ url;
	}
	return url;
}
