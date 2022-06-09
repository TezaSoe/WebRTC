// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
$(document).ready(function () {
    //alert($(document).prop('title'));
    //alert("Your name is " + $("#upperUsername").text() + ". Am I right?");
    //alert($('#intercom').text());
    //$('#intercom').empty();
    //alert($('#intercom').text());
});

//function getPrivacy() {
//    $.ajax({
//        url: '/User/MyInfo',
//        type: 'POST',  // http method
//        dataType: 'json', // type of response data
//        data: { myData: 'This is my data.' },  // data to submit
//        success: function (data, status, xhr) {   // success callback function
//            alert(data.fullName);
//        },
//        error: function (jqXhr, textStatus, errorMessage) { // error callback 
//            alert('Error: ' + errorMessage);
//        }
//    });
//    $.ajax({
//        url: "@(Url.Action("add", "Home"))",
//        data: JSON.stringify({ 'n1': number1, 'n2': number2 }),
//        type: "POST",
//        datatype: "JSON",
//        contentType: "application/json;charset=utf-8",
//        success: function (data) {
//            $('#yourLabel').text(data); //<-- here, I look for a label with an ID
//        },
//        error: function (err) {
//            console.log(err);
//        }
//    });
//}