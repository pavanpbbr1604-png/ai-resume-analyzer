(function (window, undefined) {
    window.Asc.plugin.init = function () {
        // Plugin initialized
        console.log("AI Resume Reviewer ONLYOFFICE Plugin Loaded");
    };

    window.Asc.plugin.button = function (id) {
        this.executeCommand("close", "");
    };

    // Helper to highlight or replace target text using Office API
    window.Asc.plugin.highlightTargetText = function (targetText) {
        window.Asc.plugin.callCommand(function () {
            var oDocument = Api.GetDocument();
            var aSearch = oDocument.Search(targetText);
            if (aSearch && aSearch.length > 0) {
                aSearch[0].Select();
                aSearch[0].SetHighlight("yellow");
            }
        }, false);
    };
})(window);
