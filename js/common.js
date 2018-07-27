/**
* Toaster button callback after a click.
* @callback toasterButtonCallback
* @param {HTMLElement} toasterElement - Parent toaster element.
* @param {MouseEvent} event - Click event object.
*/

/**
* Shows a toaster with a text and two buttons.
* @param {Object} options
* @param {string} options.text - Text content of the toaster.
* @param {string} options.firstButtonText - Text content of the first button.
* @param {string} options.secondButtonText - Text content of the second button.
* @param {toasterButtonCallback} options.firstButtonCallback - Callback on click for the first button.
* @param {toasterButtonCallback} options.secondButtonCallback - Callback on click for the second button.
*/
const showToaster = (options) => {
    let updateToaster = document.createElement('div');
    updateToaster.classList.add('snackbar-container', 'snackbar-pos', 'bottom-left');
    updateToaster.style.cssText = 'width: auto; background: rgb(50, 50, 50); opacity: 1;';

    let updateToasterText = document.createElement('p');
    updateToasterText.style.cssText = 'margin: 0px; padding: 0px; color: rgb(255, 255, 255); font-size: 14px; font-weight: 300; line-height: 1em;';
    updateToasterText.textContent = options.text; //'A new update is available.';
    updateToasterText.setAttribute("role", "alert");

    let updateToasterUpdButton = document.createElement('button');
    updateToasterUpdButton.classList.add('action');
    updateToasterUpdButton.style.cssText = 'color: rgb(76, 175, 80);';
    updateToasterUpdButton.textContent = options.firstButtonText;

    let updateToasterIgnButton = document.createElement('button');
    updateToasterIgnButton.classList.add('action');
    updateToasterIgnButton.style.cssText = 'color: rgb(225, 0, 80);';
    updateToasterIgnButton.textContent = options.secondButtonText;

    updateToaster.append(updateToasterText);
    updateToaster.append(updateToasterUpdButton);
    updateToaster.append(updateToasterIgnButton);
    document.body.append(updateToaster);

    updateToasterUpdButton.addEventListener('click', (evt) => {
        options.firstButtonCallback(updateToaster, evt);
    });
    updateToasterIgnButton.addEventListener('click', (evt) => {
        options.secondButtonCallback(updateToaster, evt);
    });
};

/**
* Shows a notification indicating that a new update is available.
* @param worker - Service worker reference.
*/
const updateReady = (worker) => {
    showToaster({
        text: 'A new update is available.',
        firstButtonText: 'Update',
        secondButtonText: 'Ignore',
        firstButtonCallback: (toasterElement) => {
            toasterElement.style.opacity = 0;
            worker.postMessage({action: 'skipWaiting'});
        },
        secondButtonCallback: (toasterElement) => {
            toasterElement.style.opacity = 0;
        }
    });
};

/**
* Tracks if the service worker is installed successfully and calls updateReady.
* @param worker - Service worker reference.
*/
const trackInstalling = (worker) => {
    worker.addEventListener('statechange', function() {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};

const flushQueuedRequests = () => {
    // fetch('http://localhost:1337/reviews/',
    // {
    //     method: 'post',
    //     body: requestBody
    // });
}

const showOfflineState = () => {
    const offlineTooltip = document.getElementById("offline--state")
    offlineTooltip.classList.add("visible");
    offlineTooltip.removeAttribute('hidden');
};

const hideOfflineState = () => {
    const offlineTooltip = document.getElementById("offline--state")
    offlineTooltip.classList.remove("visible");
    offlineTooltip.setAttribute('hidden', 'true');
}

/**
* Service worker registration.
*/
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        if (navigator.serviceWorker.controller) {
            flushQueuedRequests();
        } else {
            navigator.serviceWorker.register('/sw.js').then(function(reg) {
                if (!navigator.serviceWorker.controller) {
                    return;
                }

                if (reg.waiting) {
                    updateReady(reg.waiting);
                    return;
                }

                if (reg.installing) {
                    trackInstalling(reg.installing);
                    return;
                }

                reg.addEventListener('updatefound', function() {
                    trackInstalling(reg.installing);
                });
            });

            // Ensure refresh is only called once.
            // This works around a bug in "force update on reload".
            var refreshing;
            navigator.serviceWorker.oncontrollerchange = function() {
                this.controller.onstatechange = function() {
                    if (this.state === 'activated') {
                        flushQueuedRequests();
                    }
                };
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            };
        }
    });
}

window.addEventListener('online', function() {
    hideOfflineState();
    // Notify sw about the online state
    navigator.serviceWorker.controller.postMessage({
        'status': 'online'
    });
});

window.addEventListener('offline', function() {
    showOfflineState();
});
