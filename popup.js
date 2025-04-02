document.addEventListener('DOMContentLoaded', function() {
  // Load saved credentials and schedules
  chrome.storage.sync.get(['username', 'password', 'loginTime', 'logoutTime'], function(result) {
    if (result.username) {
      document.getElementById('username').value = result.username;
    }
    if (result.password) {
      document.getElementById('password').value = result.password;
    }
    if (result.loginTime) {
      document.getElementById('loginTime').value = result.loginTime;
    }
    if (result.logoutTime) {
      document.getElementById('logoutTime').value = result.logoutTime;
    }
  });

  // Save credentials
  document.getElementById('save').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      showStatus('Please enter both username and password', 'error');
      return;
    }
    
    chrome.storage.sync.set({
      username: username,
      password: password
    }, function() {
      showStatus('Credentials saved successfully!', 'success');
    });
  });

  // Schedule login and logout
  document.getElementById('scheduleLoginLogout').addEventListener('click', function() {
    const loginTime = document.getElementById('loginTime').value;
    const logoutTime = document.getElementById('logoutTime').value;
    
    if (!loginTime && !logoutTime) {
      showStatus('Please select at least one time to schedule', 'error');
      return;
    }
    
    // Save the scheduled times
    chrome.storage.sync.set({
      loginTime: loginTime,
      logoutTime: logoutTime
    }, function() {
      let message = '';
      
      // Schedule login if provided
      if (loginTime) {
        // Calculate time until login
        const now = new Date();
        const scheduledLoginTime = new Date();
        
        const [loginHours, loginMinutes] = loginTime.split(':');
        scheduledLoginTime.setHours(parseInt(loginHours));
        scheduledLoginTime.setMinutes(parseInt(loginMinutes));
        scheduledLoginTime.setSeconds(0);
        
        // If the scheduled time is earlier today, schedule it for tomorrow
        if (scheduledLoginTime < now) {
          scheduledLoginTime.setDate(scheduledLoginTime.getDate() + 1);
        }
        
        // Set an alarm for the scheduled login time
        chrome.alarms.create('scheduledLogin', {
          when: scheduledLoginTime.getTime()
        });
        
        message += `Login scheduled for ${loginTime}. `;
      }
      
      // Schedule logout if provided
      if (logoutTime) {
        // Calculate time until logout
        const now = new Date();
        const scheduledLogoutTime = new Date();
        
        const [logoutHours, logoutMinutes] = logoutTime.split(':');
        scheduledLogoutTime.setHours(parseInt(logoutHours));
        scheduledLogoutTime.setMinutes(parseInt(logoutMinutes));
        scheduledLogoutTime.setSeconds(0);
        
        // If the scheduled time is earlier today, schedule it for tomorrow
        if (scheduledLogoutTime < now) {
          scheduledLogoutTime.setDate(scheduledLogoutTime.getDate() + 1);
        }
        
        // Set an alarm for the scheduled logout time
        chrome.alarms.create('scheduledLogout', {
          when: scheduledLogoutTime.getTime()
        });
        
        message += `Logout scheduled for ${logoutTime}.`;
      }
      
      showStatus(message, 'success');
    });
  });

  // Login now
  document.getElementById('login').addEventListener('click', function() {
    performLogin();
  });
  
  // Logout now
  document.getElementById('logout').addEventListener('click', function() {
    performLogout();
  });

  // Add this function at the beginning of your popup.js file
  function findOrCreateSahayogTab(callback) {
    // First check if there's already a tab with sahayog.uknowva.com
    chrome.tabs.query({url: "*://sahayog.uknowva.com/*"}, function(tabs) {
      if (tabs.length > 0) {
        // Found an existing tab, activate it
        chrome.tabs.update(tabs[0].id, {active: true}, function() {
          callback(tabs[0]);
        });
      } else {
        // No existing tab, create a new one
        chrome.tabs.create({ url: 'https://sahayog.uknowva.com/' }, function(newTab) {
          callback(newTab);
        });
      }
    });
  }
  
  // Then update your performLogin function
  function performLogin() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        showStatus('No active tab found', 'error');
        return;
      }
      
      const currentTab = tabs[0];
      const currentUrl = currentTab.url || '';
      
      if (!currentUrl.includes('sahayog.uknowva.com')) {
        // Use the findOrCreateSahayogTab function instead of creating a new tab directly
        findOrCreateSahayogTab(function(tab) {
          // Wait for the page to load before attempting to login
          setTimeout(function() {
            chrome.tabs.sendMessage(tab.id, {action: "performLogin"}, function(response) {
              if (chrome.runtime.lastError) {
                // Content script not ready, inject it first
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content.js']
                }, function() {
                  // Now try sending the message again
                  setTimeout(function() {
                    chrome.tabs.sendMessage(tab.id, {action: "performLogin"});
                  }, 1000);
                });
              }
            });
          }, 2000);
        });
      } else {
        // Check if content script is ready before sending message
        try {
          chrome.tabs.sendMessage(currentTab.id, {action: "ping"}, function(response) {
            if (chrome.runtime.lastError) {
              // Content script not ready, inject it first
              chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
              }, function() {
                // Now try sending the message again
                setTimeout(function() {
                  chrome.tabs.sendMessage(currentTab.id, {action: "performLogin"});
                }, 500);
              });
            }
          });
        } catch (error) {
          showStatus('Error communicating with the page: ' + error.message, 'error');
        }
      }
    });
  }
  
  // And update your performLogout function similarly
  function performLogout() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        showStatus('No active tab found', 'error');
        return;
      }
      
      const currentTab = tabs[0];
      const currentUrl = currentTab.url || '';
      
      if (!currentUrl.includes('sahayog.uknowva.com')) {
        // Use the findOrCreateSahayogTab function instead of creating a new tab directly
        findOrCreateSahayogTab(function(tab) {
          // Wait for the page to load before attempting to logout
          setTimeout(function() {
            chrome.tabs.sendMessage(tab.id, {action: "performLogout"}, function(response) {
              if (chrome.runtime.lastError) {
                // Content script not ready, inject it first
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content.js']
                }, function() {
                  // Now try sending the message again
                  setTimeout(function() {
                    chrome.tabs.sendMessage(tab.id, {action: "performLogout"});
                  }, 1000);
                });
              }
            });
          }, 2000);
        });
      } else {
        // Check if content script is ready before sending message
        try {
          chrome.tabs.sendMessage(currentTab.id, {action: "ping"}, function(response) {
            if (chrome.runtime.lastError) {
              // Content script not ready, inject it first
              chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
              }, function() {
                // Now try sending the message again
                setTimeout(function() {
                  chrome.tabs.sendMessage(currentTab.id, {action: "performLogout"});
                }, 500);
              });
            }
          });
        } catch (error) {
          showStatus('Error communicating with the page: ' + error.message, 'error');
        }
      }
    });
  }

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(function() {
      statusElement.style.display = 'none';
    }, 3000);
  }
});