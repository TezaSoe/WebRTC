const isDebugging = true;
var hubUrl = document.location.pathname + 'ConnectionHub';
var wsconn = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, signalR.HttpTransportType.WebSockets)
    .configureLogging(signalR.LogLevel.None).build();

//var peerConnectionConfig = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };
var peerConnectionConfig = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302?transport=udp" },
        { "urls": "stun:numb.viagenie.ca:3478?transport=udp" },
        { "urls": "turn:numb.viagenie.ca:3478?transport=udp", "username": "shahzad@fms-tech.com", "credential": "P@ssw0rdfms" },
        { "urls": "turn:turn-testdrive.cloudapp.net:3478?transport=udp", "username": "redmond", "credential": "redmond123" }
    ]
};

var currentPartnerId = "";
var channelValueInit = 'content';

$(document).ready(function () {
    initializeSignalR();

    $('#status').on('change', function () {
        //alert(this.value);
        wsconn.invoke('UpdateUserInfo', { "userEmail": $("#upperUsername").text(), "userStatus": parseInt(this.value) }).catch(err => console.log(err));
        //updateUserList(currentUserList, currentActiveCount);
    });
    
    // Add click handler to users in the "Users" pane
    $(document).on('click', '.user', function () {
        console.log('calling user... ');
        // Find the target user's SignalR client id
        var targetConnectionId = $(this).attr('data-cid');

        //var targetUserImageId = "img-" + $(this).attr('data-username');
        //alert($(this).find('img').attr('src'));
        //alert($('#img-' + targetConnectionId).attr("src"));

        //alert($("#img-tayzar.soe@woven-planet.global").attr("src"));
        // Make sure we are in a state where we can make a call
        if ($('body').attr("data-mode") !== "idle") {
            alertify.error('Sorry, you are already in a call.  Conferencing is not yet implemented.');
            return;
        }

        // Then make sure we aren't calling ourselves.
        if (targetConnectionId != myConnectionId) {
            currentPartnerId = targetConnectionId;
            // Initiate a call
            wsconn.invoke('callUser', { "connectionId": targetConnectionId });
            calling_audio_play();

            // UI in calling mode
            $('body').attr('data-mode', 'calling');
            $("#callstatus").text('Calling...');
            $("#callee-image").attr("src", $(this).find('img').attr('src'));
            $("#userList").css("display", "none");
            $("#endcall-footer").css("display", "");
        } else {
            alertify.error("Ah, nope.  Can't call yourself.");
        }
    });

    // Add handler for the hangup button
    $('.hangup').click(function () {
        callEnd()();
    });

    $('#micsetting').change(function () {
        if (this.checked) {
            if (localStream != null) {
                localStream.getAudioTracks()[0].enabled = true; // or false to mute it.
            } else {
                this.checked = false;
                return;
            }        
        }
        else {
            if (localStream != null) {
                localStream.getAudioTracks()[0].enabled = false;
            } else {
                this.checked = true;
                return;
            }
        }

        wsconn.invoke('SendAudioONOFF', this.checked, { "connectionId": currentPartnerId }).catch(err => console.log(err));
        chekcMicSetting(this.checked, $("#call-animation").hasClass("call-animation"));
    });

    $("#incallAction").css("display", "");
    AudioControl();
    createAudio(channelValueInit);
});

function callEnd() {
    console.log('hangup....');
    currentPartnerId = "";

    calling_audio_stop();
    incoming_audio_stop();
    $('#micsetting').prop('checked', false);
    if (localStream != null) {
        localStream.getAudioTracks()[0].enabled = true;
    }

    // Only allow hangup if we are not idle
    //localStream.getTracks().forEach(track => track.stop());
    if ($('body').attr("data-mode") !== "idle") {
        wsconn.invoke('hangUp');

        closeAllConnections();
        $('body').attr('data-mode', 'idle');
        $("#callstatus").text('Idle');
        $("#userList").css("display", "");
        $("#endcall-footer").css("display", "none");
    }
}

chekcMicSetting = (myaudio, partneraudio) => {
    if (myaudio && partneraudio) {
        $("#call-animation").removeClass("call-animation").addClass("call-animation");
    }
    else if (myaudio || partneraudio) {
        if (myaudio) {
            $("#call-animation").removeClass("call-animation");
        }
        else {
            $("#call-animation").removeClass("call-animation").addClass("call-animation");
        }
    }
    else {
        $("#call-animation").removeClass("call-animation");
    }
};

// Hub Callback: Your Audio ON/OFF
wsconn.on('ReceiveAudioONOFF', (partnerAudioOnOff) => {
    console.log('SignalR: your partner audio is ' + partnerAudioOnOff + ' .');
    chekcMicSetting($('#micsetting').prop('checked'), partnerAudioOnOff);
});

var webrtcConstraints = { audio: true, video: false };
var streamInfo = { applicationName: WOWZA_APPLICATION_NAME, streamName: WOWZA_STREAM_NAME, sessionId: WOWZA_SESSION_ID_EMPTY };

var WOWZA_STREAM_NAME = null, connections = {}, localStream = null;

attachMediaStream = (e) => {
    console.log("OnPage: called attachMediaStream");
    var partnerAudio = document.querySelector('.audio.partner');
    if (partnerAudio.srcObject !== e.stream) {
        partnerAudio.srcObject = e.stream;
        console.log("OnPage: Attached remote stream");
    }
};

const receivedCandidateSignal = (connection, partnerClientId, candidate) => {
    console.log('WebRTC: adding full candidate');
    connection.addIceCandidate(new RTCIceCandidate(candidate), () => console.log("WebRTC: added candidate successfully"), () => console.log("WebRTC: cannot add candidate"));
}

// Process a newly received Session Description Protocol(SDP) signal
const receivedSdpSignal = (connection, partnerClientId, sdp) => {
    console.log('WebRTC: called receivedSdpSignal');
    console.log('WebRTC: processing sdp signal');
    connection.setRemoteDescription(new RTCSessionDescription(sdp), () => {
        console.log('WebRTC: set Remote Description');
        if (connection.remoteDescription.type == "offer") {
            console.log('WebRTC: remote Description type offer');

            connection.addStream(localStream);
            console.log('WebRTC: added stream');

            connection.createAnswer().then((desc) => {
                console.log('WebRTC: create Answer...');

                connection.setLocalDescription(desc, () => {
                    console.log('WebRTC: set Local Description...');
                    console.log('connection.localDescription: ', connection.localDescription);

                    sendHubSignal(JSON.stringify({ "sdp": connection.localDescription }), partnerClientId);
                }, errorHandler);
            }, errorHandler);
        } else if (connection.remoteDescription.type == "answer") {
            console.log('WebRTC: remote Description type answer');
        }
    }, errorHandler);
}

// Hand off a new signal from the signaler to the connection
const newSignal = (partnerClientId, data) => {
    console.log('WebRTC: called newSignal');

    var signal = JSON.parse(data);
    var connection = getConnection(partnerClientId);
    console.log("connection: ", connection);

    // Route signal based on type
    if (signal.sdp) {
        console.log('WebRTC: sdp signal');
        receivedSdpSignal(connection, partnerClientId, signal.sdp);
    } else if (signal.candidate) {
        console.log('WebRTC: candidate signal');
        receivedCandidateSignal(connection, partnerClientId, signal.candidate);
    } else {
        console.log('WebRTC: adding null candidate');
        connection.addIceCandidate(null, () => console.log("WebRTC: added null candidate successfully"), () => console.log("WebRTC: cannot add null candidate"));
    }
}

const onReadyForStream = (connection) => {
    console.log("WebRTC: called onReadyForStream");
    // The connection manager needs our stream
    connection.addStream(localStream);
    console.log("WebRTC: added stream");
}

const onStreamRemoved = (connection, streamId) => {
    console.log("WebRTC: onStreamRemoved -> Removing stream: ");
}
// Close the connection between myself and the given partner
const closeConnection = (partnerClientId) => {
    console.log("WebRTC: called closeConnection ");
    var connection = connections[partnerClientId];

    if (connection) {
        // Let the user know which streams are leaving
        // todo: foreach connection.remoteStreams -> onStreamRemoved(stream.id)
        onStreamRemoved(null, null);

        // Close the connection
        connection.close();
        delete connections[partnerClientId]; // Remove the property
    }
}
// Close all of our connections
const closeAllConnections = () => {
    console.log("WebRTC: call closeAllConnections ");
    for (var connectionId in connections) {
        closeConnection(connectionId);
    }
}

const getConnection = (partnerClientId) => {
    console.log("WebRTC: called getConnection");
    if (connections[partnerClientId]) {
        console.log("WebRTC: connections partner client exist");
        return connections[partnerClientId];
    }
    else {
        console.log("WebRTC: initialize new connection");
        return initializeConnection(partnerClientId)
    }
}

const initiateOffer = (partnerClientId, stream) => {
    console.log('WebRTC: called initiateoffer: ');
    var connection = getConnection(partnerClientId); // get a connection for the given partner
    connection.addStream(stream);// add our audio/video stream
    console.log("WebRTC: Added local stream");

    connection.createOffer().then(offer => {
        console.log('WebRTC: created Offer: ');
        console.log('WebRTC: Description after offer: ', offer);
        connection.setLocalDescription(offer).then(() => {
            console.log('WebRTC: set Local Description: ');
            console.log('connection before sending offer ', connection);
            setTimeout(() => {
                sendHubSignal(JSON.stringify({ "sdp": connection.localDescription }), partnerClientId);
            }, 1000);
        }).catch(err => console.error('WebRTC: Error while setting local description', err));
    }).catch(err => console.error('WebRTC: Error while creating offer', err));
}

const callbackUserMediaSuccess = (stream) => {
    console.log("WebRTC: got media stream");
    localStream = stream;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        console.log(`Using Audio device: ${audioTracks[0].label}`);
    }
};

const initializeUserMedia = () => {
    console.log('WebRTC: InitializeUserMedia: ');
    navigator.getUserMedia(webrtcConstraints, callbackUserMediaSuccess, errorHandler);
};
// stream removed
const callbackRemoveStream = (connection, evt) => {
    console.log('WebRTC: removing remote stream from partner window');
    // Clear out the partner window
    var otherAudio = document.querySelector('.audio.partner');
    otherAudio.src = '';
}

const callbackAddStream = (connection, evt) => {
    console.log('WebRTC: called callbackAddStream');

    // Bind the remote stream to the partner window
    //var otherVideo = document.querySelector('.video.partner');
    //attachMediaStream(otherVideo, evt.stream); // from adapter.js
    attachMediaStream(evt);
}

const callbackNegotiationNeeded = (connection, evt) => {
    alert("callbackNegotiationNeeded");
    console.log("WebRTC: Negotiation needed...");
}

const callbackIceCandidate = (evt, connection, partnerClientId) => {
    console.log("WebRTC: Ice Candidate callback");

    if (evt.candidate) {// Found a new candidate
        console.log('WebRTC: new ICE candidate');
        sendHubSignal(JSON.stringify({ "candidate": evt.candidate }), partnerClientId);
    } else {
        // Null candidate means we are done collecting candidates.
        console.log('WebRTC: ICE candidate gathering complete');
        sendHubSignal(JSON.stringify({ "candidate": null }), partnerClientId);
    }
}

const initializeConnection = (partnerClientId) => {
    console.log('WebRTC: Initializing connection...');

    var connection = new RTCPeerConnection(peerConnectionConfig);

    connection.onicecandidate = evt => callbackIceCandidate(evt, connection, partnerClientId); // ICE Candidate Callback
    connection.onaddstream = evt => callbackAddStream(connection, evt); // Add stream handler callback
    connection.onremovestream = evt => callbackRemoveStream(connection, evt); // Remove stream handler callback

    connections[partnerClientId] = connection; // Store away the connection based on username

    return connection;
}

sendHubSignal = (candidate, partnerClientId) => {
    console.log('candidate', candidate);
    console.log('SignalR: called sendhubsignal ');
    wsconn.invoke('sendSignal', candidate, partnerClientId).catch(errorHandler);
};

wsconn.onclose(e => {
    if (e) {
        console.log("SignalR: closed with error.");
        console.log(e);
    }
    else {
        console.log("Disconnected");
    }
});

// Hub Callback: Update User List
wsconn.on('updateUserList', (userList, activeUserCount) => {
    //currentUserList = userList;
    //currentActiveCount = activeUserCount;
    updateUserList(userList, activeUserCount);
});

updateUserList = (userList, activeUserCount) => {
    consoleLogger('SignalR: called updateUserList' + JSON.stringify(userList));
    $("#allUsersLength").text(userList.length);
    //$("#usersLength").text(activeUserCount);

    //$('#usersdata li.allusers').remove();
    //$('#allusers').empty();

    $('#availableusers').empty();
    $('#busyusers').empty();
    //$('#idleusers').empty();
    $('#offlineusers').empty();
    $('#availabletitle').css("display", "none");
    $('#busytitle').css("display", "none");
    $('#offlinetitle').css("display", "none");
    var availablecount = 0, busycount = 0, idlecount = 0, offlinecount = 0;
    $("#availableUsersLength").text(availablecount);
    $("#busyUsersLength").text(busycount);
    //$("#idleUsersLength").text(idlecount);
    $("#offlineUsersLength").text(offlinecount);

    $.each(userList, function (index) {
        //consoleLogger('SignalR: User Email' + userList[index].userEmail);
        var status = '', ellipse = '', activestatus = '';
        if (userList[index].userEmail === $("#upperUsername").text()) {
            myConnectionId = userList[index].connectionId;

            if (userList[index].inCall) {
                ellipse = '<div class="ellipse busy"></div>';
                activestatus = 'Busy';
            } else {
                if (userList[index].userStatus == 1) {
                    ellipse = '<div class="ellipse busy"></div>';
                    activestatus = 'Busy';
                }
                else if (userList[index].userStatus == 2) {
                    ellipse = '<div class="ellipse idle"></div>';
                    activestatus = 'Idle';
                }
                else if (userList[index].userStatus == 3) {
                    ellipse = '<div class="ellipse offline"></div>';
                    activestatus = 'Offline';
                }
                else {
                    ellipse = '<div class="ellipse available"></div>';
                    activestatus = 'Available';
                }
            }
            status = 'Me';
            $('#status').val(userList[index].userStatus)
        } else {
            if (userList[index].inCall) {
                ellipse = '<div class="ellipse busy"></div>';
                status = activestatus = 'Busy';
            } else {
                if (userList[index].userStatus == 1) {
                    ellipse = '<div class="ellipse busy"></div>';
                    status = activestatus = 'Busy';
                }
                else if (userList[index].userStatus == 2) {
                    ellipse = '<div class="ellipse idle"></div>';
                    status = activestatus = 'Idle';
                }
                else if (userList[index].userStatus == 3) {
                    ellipse = '<div class="ellipse offline"></div>';
                    status = activestatus = 'Offline';
                }
                else {
                    ellipse = '<div class="ellipse available"></div>';
                    status = activestatus = 'Available';
                }
            }
        }

        var listString = "";

        if (userList[index].connectionId) {
            if (userList[index].userStatus == 3) {
                listString += '<a class="image-container" data-cid=' + userList[index].connectionId + ' data-username=' + userList[index].userEmail + '>';
            } else {
                listString += '<a href="#" class="user image-container" onclick="event.preventDefault();" data-cid=' + userList[index].connectionId + ' data-username=' + userList[index].userEmail + '>';
            }
            listString += '<img id="img-' + userList[index].connectionId + '" class="image-list" src="data:image/png;base64, ' + userList[index].googleProfile + '"/>';
            listString += '<div class="image-text">' + userList[index].userFullName + '</div>';
            listString += '<div class="image-status" id="status-' + userList[index].connectionId + '">' + ellipse + status + '</div>';
            listString += '</a>';
        }
        else {
            ellipse = '<div class="ellipse offline"></div>';
            status = activestatus = 'Offline';

            listString += '<a class="image-container" data-cid="" data-username=' + userList[index].userEmail + '>';
            listString += '<img class="image-list" src="data:image/png;base64, ' + userList[index].googleProfile + '"/>';
            listString += '<div class="image-text">' + userList[index].userFullName + '</div>';
            listString += '<div class="image-status">' + ellipse + status + '</div>';
            listString += '</a>';
        }

        //$('#allusers').append(listString);

        if (activestatus == 'Busy') {
            busycount++;
            $("#busyUsersLength").text(busycount);
            $('#busyusers').append(listString);
            //} else if (activestatus == 'Idle') {
            //    idlecount++;
            //    $("#idleUsersLength").text(idlecount);
            //    $('#idleusers').append(listString);
        } else if (activestatus == 'Offline') {
            offlinecount++;
            $("#offlineUsersLength").text(offlinecount);
            $('#offlineusers').append(listString);
        } else {
            availablecount++;
            $("#availableUsersLength").text(availablecount);
            $('#availableusers').append(listString);
        }
    });

    if (!$('#availableusers').is(':empty')) {
        $("#availabletitle").css("display", "");
    }
    if (!$('#busyusers').is(':empty')) {
        $('#busytitle').css("display", "");
    }
    if (!$('#offlineusers').is(':empty')) {
        $('#offlinetitle').css("display", "");
    }    
}

// Hub Callback: Call Accepted
wsconn.on('callAccepted', (acceptingUser) => {
    console.log('SignalR: call accepted from: ' + JSON.stringify(acceptingUser) + '.  Initiating WebRTC call and offering my stream up...');

    // Callee accepted our call, let's send them an offer with our video stream
    initiateOffer(acceptingUser.connectionId, localStream); // Will use driver email in production
    $('#micsetting').prop('checked', true);
    wsconn.invoke('SendAudioONOFF', true, { "connectionId": currentPartnerId }).catch(err => console.log(err));

    // Set UI into call mode
    $('body').attr('data-mode', 'incall');
    $("#callstatus").text('In Call');
});

// Hub Callback: Call Declined
wsconn.on('callDeclined', (decliningUser, reason) => {
    console.log('SignalR: call declined from: ' + decliningUser.connectionId);

    // Let the user know that the callee declined to talk
    alertify.error(reason);

    // Back to an idle UI
    $('body').attr('data-mode', 'idle');
});

// Hub Callback: Incoming Call
wsconn.on('incomingCall', (callingUser) => {
    console.log('SignalR: incoming call from: ' + JSON.stringify(callingUser));

    // I want to chat
    wsconn.invoke('AnswerCall', true, callingUser).catch(err => console.log(err));
    incoming_audio_play();
    currentPartnerId = callingUser.connectionId;
    wsconn.invoke('SendAudioONOFF', false, { "connectionId": currentPartnerId }).catch(err => console.log(err));

    if (localStream != null) {
        localStream.getAudioTracks()[0].enabled = false;
    }
    // So lets go into call mode on the UI
    $('body').attr('data-mode', 'incall');
    $("#callstatus").text('In Call');
    $("#callee-image").attr("src", $("#img-" + currentPartnerId).attr('src'));
    $("#userList").css("display", "none");
    $("#endcall-footer").css("display", "");

    //// Ask if we want to talk
    //alertify.confirm(callingUser.username + ' is calling.  Do you want to chat?', function (e) {
    //    if (e) {
    //        // I want to chat
    //        wsconn.invoke('AnswerCall', true, callingUser).catch(err => console.log(err));

    //        // So lets go into call mode on the UI
    //        $('body').attr('data-mode', 'incall');
    //        $("#callstatus").text('In Call');
    //    } else {
    //        // Go away, I don't want to chat with you
    //        wsconn.invoke('AnswerCall', false, callingUser).catch(err => console.log(err));
    //    }
    //});
});

// Hub Callback: WebRTC Signal Received
wsconn.on('receiveSignal', (signalingUser, signal) => {
    newSignal(signalingUser.connectionId, signal);
});

// Hub Callback: Call Ended
wsconn.on('callEnded', (signalingUser, signal) => {
    console.log('SignalR: call with ' + signalingUser.connectionId + ' has ended: ' + signal);
    currentPartnerId = "";

    calling_audio_stop();
    incoming_audio_stop();
    $('#micsetting').prop('checked', false);
    if (localStream != null) {
        localStream.getAudioTracks()[0].enabled = true;
    }

    // Let the user know why the server says the call is over
    alertify.error(signal);

    // Close the WebRTC connection
    closeConnection(signalingUser.connectionId);

    // Set the UI back into idle mode
    $('body').attr('data-mode', 'idle');
    $("#callstatus").text('Idle');
    $("#userList").css("display", "");
    $("#endcall-footer").css("display", "none");
});

const initializeSignalR = () => {
    wsconn.start().then(() => { console.log("SignalR: Connected"); askUsername(); }).catch(err => console.log(err));
};

const setUsername = (username) => {
    consoleLogger('SingnalR: setting username...');
    wsconn.invoke("Join", username).catch((err) => {
        consoleLogger(err);
        alertify.alert('<h4>Failed SignalR Connection</h4> We were not able to connect you to the signaling server.<br/><br/>Error: ' + JSON.stringify(err));
        //viewModel.Loading(false);
    });

    //$("#upperUsername").text(username);
    //$('div.username').text(username);
    initializeUserMedia();
};

const askUsername = () => {
    consoleLogger('SignalR: Asking username...');

    setUsername($("#upperUsername").text());
    //alertify.prompt('Select a username', 'What is your name?', '', (evt, Username) => {
    //    if (Username !== '')
    //        setUsername(Username);
    //    else
    //        generateRandomUsername();

    //}, () => {
    //    generateRandomUsername();
    //});
};

//const generateRandomUsername = () => {
//    consoleLogger('SignalR: Generating random username...');
//    let username = 'User ' + Math.floor((Math.random() * 10000) + 1);
//    alertify.success('You really need a username, so we will call you... ' + username);
//    setUsername(username);
//};

const errorHandler = (error) => {
    if (error.message)
        alertify.alert('<h4>Error Occurred</h4></br>Error Info: ' + JSON.stringify(error.message));
    else
        alertify.alert('<h4>Error Occurred</h4></br>Error Info: ' + JSON.stringify(error));

    consoleLogger(error);
};

const consoleLogger = (val) => {
    if (isDebugging) {
        console.log(val);
    }
};

//AudioControl = (audio) => {
AudioControl = () => {
    var audio = document.getElementById("audio"),
        button = document.getElementById("button"),
        refreshaudio = document.getElementById("refreshaudio"),
        //volumecontrol = document.getElementById("VolumeControl"),
        isPlaying = false;

    var initPlayer = function () {
        audio.addEventListener("play", audioPlayAction, false);
        audio.addEventListener("pause", audioPauseAction, false);
        audio.addEventListener("seeking", audioSeekingAction, false);
        audio.addEventListener("seeked", audioSeekedAction, false);
        button.addEventListener("click", buttonClickAction, false);
        refreshaudio.addEventListener("click", refreshAudioClickAction, false);
        //volumecontrol.addEventListener("change", volumeChangeAction, false);
        //$("#VolumeValue").text(audio.volume);
        //volumecontrol.value = audio.volume;
    },
    buttonClickAction = function (event) {
        if (isPlaying) {
            audio.pause();
            button.classList.add("is-playing");
        } else {
            audio.play();
            button.classList.remove("is-playing");
        }
        event.preventDefault();
    },
    refreshAudioClickAction = function (event) {
        if (isPlaying) {
            audio.pause();
            button.classList.add("is-playing");
            setTimeout(function () {
                //$('#button').click();
                audio.play();
                button.classList.remove("is-playing");
            }, 500);
        } else {
            audio.play();
            button.classList.remove("is-playing");
        }
    },
    audioPlayAction = function (event) {
        button.classList.add("is-playing");
        isPlaying = true;

    },
    audioPauseAction = function (event) {
        button.classList.remove("is-playing");
        isPlaying = false;
    },
    audioSeekingAction = function (event) {
        event.target.play()
    },
    audioSeekedAction = function (event) {
        event.target.play()
    };
    //volumeChangeAction = function () {
    //    let volume = $(this).val();
    //    $("#VolumeValue").text(volume);
    //    audio.volume = volume;
    //};

    initPlayer();
}

function createAudio(channelValue) {
    if (navigator.mozAudioChannelManager) {
        if (channelValue == 'normal') {
            navigator.mozAudioChannelManager.volumeControlChannel = 'normal';
        } else if (channelValue == 'content') {
            navigator.mozAudioChannelManager.volumeControlChannel = 'content';
        }
        console.log(navigator.mozAudioChannelManager.volumeControlChannel);
    }

    var calling_audio_isplaying = false, incoming_audio_isplaying = false;

    //var audio1 = document.getElementById("calling"),
    //    audio2 = document.getElementById("incoming");

    ////calling sound
    //var calling_audio = document.createElement('audio');
    //var calling_audio_source = document.createElement('source');
    //calling_audio.controls = true;
    //calling_audio.mozAudioChannelType = channelValue;
    //calling_audio_source.src = '../audio/Calling_16bit48kHz_210225.mp3';
    //calling_audio_source.type = 'audio/mp3';
    ////calling_audio_source.src = '../audio/Calling_16bit48kHz_210225.wav';
    ////calling_audio_source.type = 'audio/wav';
    //calling_audio.appendChild(calling_audio_source);
    calling_audio_play = () => {
        calling_audio_isplaying = true;
        //calling_audio.play();
        //beep1();
        Tone.loaded().then(() => {
            tone_player_calling.volume.value = -12;
            tone_player_calling.start();
        });
    }
    calling_audio_stop = () => {
        if (calling_audio_isplaying) {
            calling_audio_isplaying = false;
            //calling_audio.pause();
            //calling_audio.currentTime = 0;
            //snd1.pause();
            //snd2.currentTime = 0;
            tone_player_calling.stop();
        }
    }
    //calling_audio.onended = function () {
    //    calling_audio_isplaying = false;
    //    $('#refreshaudio').click();
    //};

    ////incoming sound
    //var incoming_audio = document.createElement('audio');
    //var incoming_audio_source = document.createElement('source');
    //incoming_audio.controls = true;
    //incoming_audio.mozAudioChannelType = channelValue;
    //incoming_audio_source.src = '../audio/IncomingCall_16bit48kHz_210225.mp3';
    //incoming_audio_source.type = 'audio/mp3';
    ////incoming_audio_source.src = '../audio/IncomingCall_16bit48kHz_210225.wav';
    ////incoming_audio_source.type = 'audio/wav';
    //incoming_audio.appendChild(incoming_audio_source);
    incoming_audio_play = () => {
        incoming_audio_isplaying = true;
        //incoming_audio.play();
        //beep2();
        //$('#beep2').click();

        Tone.loaded().then(() => {
            tone_player_incoming.volume.value = -10;
            tone_player_incoming.start();
        });
    }
    incoming_audio_stop = () => {
        if (incoming_audio_isplaying) {
            incoming_audio_isplaying = false;
            //incoming_audio.pause();
            //incoming_audio.currentTime = 0;
            //snd2.pause();
            //snd2.currentTime = 0;
            tone_player_incoming.stop();
        }
    }
    //incoming_audio.onended = function () {
    //    incoming_audio_isplaying = false;
    //    $('#refreshaudio').click();
    //};
}

//function beep1() {
//    //var snd1 = new Audio(CALL_RING);
//    snd1.volume = 0.3;
//    snd1.play();
//}

//function beep2() {
//    //var snd2 = new Audio(CALL_RING);
//    //snd2.load();
//    snd2.volume = 0.3;
//    snd2.play();
//}

//snd1.onload = function () {
//    alert("snd1 load.");

//};
//snd1.onerror = function () {
//    alert("snd1 error.");

//};
//snd1.onloadeddata = function () {
//    //alert("snd1 onloadeddata.");

//};
//snd1.onloadedmetadata = function () {
//    //alert("snd1 onloadedmetadata.");

//};
//snd1.oncanplay = function () {
//    //alert("snd1 can play.");
//};
//snd1.onended = function () {
//    //alert("snd1 end.");
//    //$('#refreshaudio').click();
//    calling_audio_isplaying = false;
//};

//snd2.onload = function () {
//    alert("snd2 load.");

//};
//snd2.onerror = function () {
//    alert("snd2 error.");

//};
//snd2.onloadeddata = function () {
//    //alert("snd2 onloadeddata.");

//};
//snd2.onloadedmetadata = function () {
//    //alert("snd2 onloadedmetadata.");

//};
//snd2.oncanplay = function () {
//    //alert("snd2 can play.");

//};
//snd2.onended = function () {
//    //alert("snd2 end.");
//    //$('#refreshaudio').click();
//    incoming_audio_isplaying = false;
//};

//function playSound(id) {
//    var audioFile = document.getElementById(id);
//    audioFile.Play();
//    return false;
//}