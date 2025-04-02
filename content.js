// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "performLogin" || request.action === "autoLogin") {
    performLogin();
    sendResponse({status: "login attempted"});
    return true;
  } else if (request.action === "performLogout") {
    performLogout();
    sendResponse({status: "logout attempted"});
    return true;
  } else if (request.action === "ping") {
    // Respond to ping to confirm content script is loaded
    sendResponse({status: "content script ready"});
    return true;
  }
});

// Function to perform the login
function performLogin() {
  chrome.storage.sync.get(['username', 'password'], function(credentials) {
    if (!credentials.username || !credentials.password) {
      console.log('No saved credentials found');
      return;
    }

    // Find the login form elements
    const usernameField = document.querySelector('input[type="text"], input[type="email"], input[name="username"]');
    const passwordField = document.querySelector('input[type="password"]');
    const loginButton = document.querySelector('button[type="submit"], input[type="submit"], .login-button');

    if (usernameField && passwordField && loginButton) {
      // Fill in the credentials
      usernameField.value = credentials.username;
      passwordField.value = credentials.password;
      
      // Trigger input events to ensure any form validation recognizes the changes
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Click the login button
      loginButton.click();
      
      console.log('Login attempted');
      
      // Set up a check for the biometric authentication
      checkForBiometricAndClick();
      
      // Mark as logged in
      chrome.storage.sync.set({loggedIn: true});
    } else {
      console.log('Could not find login form elements');
      
      // Check if we're already on a page with biometric authentication
      checkForBiometricAndClick();
    }
  });
}

// Function to perform the logout
function performLogout() {
  console.log('Attempting to logout');
  
  // First try to find and click the checkout button
  const checkoutButton = document.getElementById('checkoutbutton');
  if (checkoutButton) {
    console.log('Checkout button found, clicking it');
    checkoutButton.click();
    
    // Set up a check for both biometric checkout authentications
    handleBiometricCheckoutSequence();
  } else {
    console.log('Checkout button not found, looking for biometric checkout directly');
    handleBiometricCheckoutSequence();
  }
}

// Function to handle the sequence of biometric checkouts
function handleBiometricCheckoutSequence() {
  let firstBiometricClicked = false;
  
  // Set up an interval to check for both biometric elements
  const biometricCheckoutInterval = setInterval(function() {
    // First look for the initial biometric element
    if (!firstBiometricClicked) {
      const biometricElement = document.querySelector('.finger_scan_checkout ');
      if (biometricElement) {
        console.log('First biometric authentication element found, clicking it');
        biometricElement.click();
        firstBiometricClicked = true;
        
        // Don't clear the interval yet, we need to wait for the second biometric
        console.log('Waiting for second biometric element...');
      }
    } 
    // After clicking the first one, look for the second biometric element
    else {
      const biometricCheckoutElement = document.querySelector('.finger_scan_checkout ');
      if (biometricCheckoutElement) {
        console.log('Second biometric checkout element found, clicking it');
        biometricCheckoutElement.click();
        clearInterval(biometricCheckoutInterval);
        
        // Mark as logged out
        chrome.storage.sync.set({loggedIn: false});
        console.log('Successfully logged out');
      }
    }
  }, 1000); // Check every second
  
  // Stop checking after 60 seconds to prevent infinite loop
  setTimeout(function() {
    clearInterval(biometricCheckoutInterval);
    console.log('Timeout reached for biometric checkout sequence');
  }, 60000);
}

// Function to check for biometric authentication and click it
function checkForBiometricAndClick() {
  // Set up an interval to check for the biometric element
  const biometricCheckInterval = setInterval(function() {
    const biometricElement = document.querySelector('.finger_scan_checkout ');
    if (biometricElement) {
      console.log('Biometric authentication element found, clicking it');
      biometricElement.click();
      clearInterval(biometricCheckInterval);
    }
  }, 1000); // Check every second
  
  // Stop checking after 30 seconds to prevent infinite loop
  setTimeout(function() {
    clearInterval(biometricCheckInterval);
  }, 30000);
}

// Check if we're on the login page and should auto-login
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // Check if this is a login page
  if (document.querySelector('form[action*="login"]') || 
      document.querySelector('input[type="password"]')) {
    // Wait a moment to ensure the page is fully loaded
    setTimeout(performLogin, 1000);
  } else {
    // Check if we're on a page with biometric authentication
    checkForBiometricAndClick();
  }
} else {
  // If the document is not yet ready, wait for it
  document.addEventListener('DOMContentLoaded', function() {
    // Check if this is a login page
    if (document.querySelector('form[action*="login"]') || 
        document.querySelector('input[type="password"]')) {
      // Wait a moment to ensure the page is fully loaded
      setTimeout(performLogin, 1000);
    } else {
      // Check if we're on a page with biometric authentication
      checkForBiometricAndClick();
    }
  });
}