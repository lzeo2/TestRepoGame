function openUnityRequest(request, method, url) {
    // The exported engine contacts these optional store, analytics and cloud
    // services. A static arcade host can only serve the offline reply by GET.
    var services = /(^|\.)(unity3d\.com|appspot\.com|swrve\.com|kongregate\.com|cloudmoolah\.com|script\.google\.com|googleusercontent\.com)$/i;
    var target;
    try {
        target = new URL(url, document.baseURI);
    } catch (error) {
        // Let XMLHttpRequest report invalid URLs as it normally would.
    }
    if (target && services.test(target.hostname)) {
        request.open("GET", "json/null.json", true);
    } else {
        request.open(method, url, true);
    }
}
