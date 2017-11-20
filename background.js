var timeoutHandler = null;
var configuration = null;

var loop = function () {
    fetchBugs(configuration.serviceUrl, function (error, data) {
        if (error) {
            new Notification("Zentao Bug Killer", {
                body: error,
                icon: 'images/icon48.png',
                tag: {}
            });
        } else {
            var newBugs = _.difference(_.pluck(data.bugs, 'id'), _.pluck(JSON.parse(localStorage.bugs || '[]'), 'id'));

            if (newBugs.length > 0) {
                var notification = new Notification("", {
                    body: 'You have ' + (newBugs.length) + ' numbers of new Bugs',
                    icon: 'images/icon48.png',
                    tag: {}
                });

                if (configuration.siteUrl) {
                    notification.onclick = function () {
                        window.open(configuration.siteUrl);
                    };
                }
            }
        }

        chrome.browserAction.setBadgeText({ text: (data.bugs.length > 0 ? data.bugs.length + '' : '') });
        localStorage.bugs = JSON.stringify(data.bugs);
        timeoutHandler = setTimeout(loop, configuration.times);
    });
};

var start = function (configuration) {
    clearTimeout(timeoutHandler);
    configuration = configuration;
    loop();
};

chrome.browserAction.setBadgeBackgroundColor({ color: '#ff0000' });
chrome.storage.local.get('configuration', function (storage) {
    if (!_.isEmpty(storage.configuration)) {
        configuration = storage.configuration;

        start(configuration);
    }
});
