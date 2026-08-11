function UnityUrlFix(url) {
	console.log("--fx--UnityUrlFix--", url);
	// Offline local-sink guard: any request aimed at the compiled Unity
	// IAP/analytics SDKs (unity3d.com, appspot.com), at the retained
	// Kongregate SDK's network endpoints (api.swrve.com analytics batch,
	// kongregate.com API/config hosts), or at the port's cloud-save/data
	// backends (cloudmoolah.com, script.google.com, googleusercontent.com)
	// is routed to a local empty response so nothing leaves this origin
	// while offline.
	if (typeof url === "string" && /(unity3d\.com|appspot\.com|swrve\.com|kongregate\.com|cloudmoolah\.com|script\.google\.com|googleusercontent\.com)/i.test(url)) {
		url = "json/null.json?"+ url;
	}
	return url;
}
