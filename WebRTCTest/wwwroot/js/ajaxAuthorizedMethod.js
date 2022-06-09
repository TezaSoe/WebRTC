// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
$(document).ready(function () {
    //alert("Your name is " + $("#upperUsername").text() + ". Am I right?");
    $('#torimo').empty();
    var mainWindowHtml = '<a class="navbar-brand navbar-brand-overwrite" href="/" onclick="getMainArea();event.preventDefault();">Torimo</a>'
    $('#torimo').append(mainWindowHtml);

    $('#privacy').empty();
    var privacyHtml = '<a class="nav-link text-dark" href="/" onclick="getPrivacyArea();event.preventDefault();">Privacy</a>'
    $('#privacy').append(privacyHtml);

    //var myinfolinkname = $("#upperUsername").text();
    //$('#myinfolink').empty();
    //var myinfolinkHtml = '<a class="nav-link text-dark" href="/" onclick="getMyInfoArea(); event.preventDefault();"><span id="upperUsername">' + myinfolinkname + '</span>!</a>';
    //$('#myinfolink').append(myinfolinkHtml);

    //@ViewData["Title"] = "";
});

function changeDisplay(mainDisplay = "", myinfoDisplay = "none", privacyDisplay = "none") {
    if (mainDisplay == "") {
        $(document).prop('title', 'Home Page - Intercom');
    } else if (myinfoDisplay == "") {
        $(document).prop('title', 'My Info - Intercom');
    } else {
        $(document).prop('title', 'Privacy Policy - Intercom');
    }

    $("#mainArea").css("display", mainDisplay);
    $("#myinfoArea").css("display", myinfoDisplay);
    $("#privacyArea").css("display", privacyDisplay);
}

function getMainArea() {
    changeDisplay("", "none", "none");
}

function getMyInfoArea() {
    $('#myinfoArea').empty();
    $.ajax({
        url: '/User/MyInfo',
        type: 'POST',  // http method
        dataType: 'json', // type of response data
        data: { myData: 'This is my data.' },  // data to submit
        success: function (data, status, xhr) {   // success callback function
            if (status == 'success') {
                //alert(data.fullName + '\n' + data.email);
                var myInfoHtml = '<h1 class="bg-info text-white">Your Login Details</h1>';
                myInfoHtml += '<table class="table table-sm table-bordered">';
                myInfoHtml += '<tr><th>Name</th><th>Email</th></tr>';
                myInfoHtml += '<tr>';
                myInfoHtml += '<td>' + data.fullName + '</td>';
                myInfoHtml += '<td>' + data.email + '</td>';
                myInfoHtml += '</tr>';
                myInfoHtml += '</table>';
                $('#myinfoArea').append(myInfoHtml);
                changeDisplay("none", "", "none");
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            alert('Error: ' + errorMessage);
        }
    });

    //$.ajax('/User',   // request url
    //{
    //    success: function (data, status, xhr) {// success callback function
    //        alert(JSON.stringify(data));
    //    }
    //});

    //$.ajax('/User/MyInfo',
    //{
    //    dataType: 'json', // type of response data
    //    timeout: 500,     // timeout milliseconds
    //    success: function (data, status, xhr) {   // success callback function
    //        alert(data.fullName);
    //    },
    //    error: function (jqXhr, textStatus, errorMessage) { // error callback 
    //        alert('Error: ' + errorMessage);
    //    }
    //});

    //$.get('/User',  // url
    //    function (data, textStatus, jqXHR) {  // success callback
    //        alert(JSON.stringify(data));
    //    });

    //$.getJSON('/User', function (data, textStatus, jqXHR) {
    //    alert(JSON.stringify(data));
    //});

    //$.getJSON('/User/MyInfo', function (data, textStatus, jqXHR) {
    //    alert(data.fullName);
    //})
    //.done(function () { alert('Request done!'); })
    //.fail(function (jqxhr, settings, ex) { alert('failed, ' + ex); });
}

function getPrivacyArea() {
    changeDisplay("none", "none", "");
}