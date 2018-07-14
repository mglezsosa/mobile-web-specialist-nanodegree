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
        options.firstButtonCallback(updateToaster);
    });
    updateToasterIgnButton.addEventListener('click', (evt) => {
        options.secondButtonCallback(updateToaster);
    });
};

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

const trackInstalling = (worker) => {
    worker.addEventListener('statechange', function() {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
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
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    });
}
