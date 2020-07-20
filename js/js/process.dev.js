"use strict";

/* 
@deploy - Deploy to a web host as a normal php website and run on browser
@desc   - Upload bulk files to AWS S3 as Multi Part Uploads
@author - Salman Javeed
@email  - salmanjaveed@gmail.com
@company- Triolutions @ triolutions.com
@date   - 24/July/2019
*/
var s3upload = null;

function upload(file) {
  if (!(window.File && window.FileReader && window.FileList && window.Blob && window.Blob.prototype.slice)) {
    alert("You are using an unsupported browser. Please update your browser.");
    return;
  }

  $("#result").text("Status: Starting...");
  $("#progress .progress-bar").css("width", "0px");
  $("#progress .progress-number").text("");
  s3upload = new S3MultiUpload(file);
  /* if (typeof upload.TotalFileSize == 'undefined') {
         upload.TotalFileSize = 0;
     }
     upload.TotalFileSize += file.size;
  
     if (typeof upload.TotalUploadSize == 'undefined') {
         upload.TotalUploadSize = 0;
     }
  */

  s3upload.onServerError = function (command, jqXHR, textStatus, errorThrown) {
    $("#result").text("Status: Upload failed with server error. " + textStatus + " " + errorThrown + " " + s3upload.file.name);
  };

  s3upload.onS3UploadError = function (xhr) {
    $("#result").text("Status: Upload to S3 failed. " + s3upload.file.name);
  };

  s3upload.onProgressChanged = function (uploadedSize, totalSize, speed) {
    upload.TotalUploadSize += uploadedSize;
    var progress = parseInt(uploadedSize / totalSize * 100, 10); // var progress = parseInt(uploadedSize / upload.TotalFileSize * 100, 10);
    // var progress = parseInt(upload.TotalUploadSize / upload.TotalFileSize * 100, 10);

    $("#progress .progress-bar").css("width", progress + "%");
    /* $("#progressbardiv").html(getReadableFileSizeString(upload.TotalUploadSize) + " / " + getReadableFileSizeString(upload.TotalFileSize) + " <span style='font-size: smaller; font-weight: bold;'>(" + progress + "%" +
     */

    $("#progressbardiv").html(getReadableFileSizeString(uploadedSize) + " / " + getReadableFileSizeString(totalSize) + " <span style='font-size: smaller; font-weight: bold;'>(" + progress + "%" +
    /* + uploadedSize + " / " + totalSize + " */
    " at " + getReadableFileSizeString(speed) + "ps" + ")</span>").css({
      "margin-left": -$(".progress-number").width() / 2
      /*
      $(".progress-number").html(file.name + " " + getReadableFileSizeString(uploadedSize) + " / " + getReadableFileSizeString(totalSize) + " <span style='font-size: smaller; font-weight: bold;'>(" + progress + "%" +
            /* + uploadedSize + " / " + totalSize + " */

      /*    " at " + getReadableFileSizeString(speed) + "ps" + ")</span>").css({
                      'margin-left': -$('.progress-number').width() / 2 */

    });
  };

  s3upload.onPrepareCompleted = function () {
    $("#result").text("Status: Uploading...");
  };

  s3upload.onUploadCompleted = function () {
    $(document).ajaxSuccess(function (event, request, settings) {
      var parsed_data = JSON.parse(request.responseText);
      $("#result").text("Status: " + parsed_data.file + " Upload successful.");
      $(document).ajaxStop(function () {
        toggleButtons(); // TotalFileSize = 0;
      });
    });
  };

  $("#result").text("Status:  Preparing upload...");
  s3upload.start();
}

function getReadableFileSizeString(fileSizeInBytes) {
  var i = -1;
  var byteUnits = [" KB", " MB", " GB", " TB", "PB", "EB", "ZB", "YB"];

  do {
    fileSizeInBytes = fileSizeInBytes / 1024;
    i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

function setCookies() {
  /*
   *  This function sets cookies to pass variables to php
   */
  document.cookie = "AccessKey=" + $("#AccessKey")[0].value;
  document.cookie = "SecretKey=" + $("#SecretKey")[0].value;
  document.cookie = "BucketName=" + $("#BucketName")[0].value;
  document.cookie = "FolderName=" + $("#FolderName")[0].value;
}

function unsetCookies() {
  /*
   *  delete all cookies
   */
  var d = new Date();
  d.setTime(d.getTime());
  var expires = "expires=" + d.toUTCString();
  var domainname = document.location.hostname;
  document.cookie = "AccessKey=" + "" + ";domainname;path=/;expires=" + expires;
  document.cookie = "SecretKey=" + "" + ";domainname;path=/;expires=" + expires;
  document.cookie = "BucketName=" + "" + ";domainname;path=/;expires=" + expires;
  document.cookie = "FolderName=" + "" + ";domainname;path=/;expires=" + expires;
}

function toggleButtons() {
  $("#startUpload").prop("disabled", !$("#startUpload").prop("disabled"));
  $("#cancelUpload").prop("disabled", !$("#cancelUpload").prop("disabled"));
}

function CheckFields() {
  if ($("#BucketName")[0].value == "") {
    $("#BucketName").focus();
    alertDiv("AWS Bucket Name is Required!");
    return false;
  }

  if ($("#AccessKey")[0].value == "") {
    $("#AccessKey").focus();
    alertDiv("AWS Access Key is Required!");
    return false;
  }

  if ($("#SecretKey")[0].value == "") {
    $("#SecretKey").focus();
    alertDiv("AWS Secret Key is Required!");
    return false;
  }

  if ($("#fileInput")[0].value == "") {
    $("#fileInput").focus();
    alertDiv("Atleast 1 filename is Required!");
    return false;
  }

  return true;
}

function alertDiv(message) {
  $("body").before('<div class="alert alert-danger alert-dismissible" id="AlertBox" data-dismiss="alert" role="alert>' + ' <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' + message + "</div>");
  /*      
    $("body").append(' <div class="alert alert-danger alert-dismissible fade show"> ' +
        ' <strong>Error!</strong>' + message +
        ' <button type="button" class="close" data-dismiss="alert">&times;</button>' +
        '</div>');
        */

  /*  $("#message").show();
      $("#message").innerhtml("<strong>Error!</strong>" + message + '<button type="button" class="close" data-dismiss="alert">&times;</button>');
      $("#message").hide();*/
}
/*
 * Below is the Main Function Start
 */


$(document).ready(function () {
  /*
   * Get Button Clicks and process them
   */
  $("#startUpload").click(function () {
    if (CheckFields()) {
      setCookies();
      $("#startUpload").prop("disabled", true); // Upload & Process all selected files

      for (i = 0; i < $("#fileInput")[0].files.length; i++) {
        // TotalFileSize += ("#fileInput")[0].files[i].size;
        //  alert(TotalFileSize);
        upload($("#fileInput")[0].files[i]);
      }

      $("#startUpload").prop("disabled", false);
      toggleButtons();
    }
  });
  $("#cancelUpload").click(function () {
    $.confirm({
      content: "This will cancel ALL ongoing uploads. Confirm Cancel?",
      title: "Confirm Action",
      buttons: {
        "Do not Cancel": {
          btnClass: "btn-blue"
        },
        Cancel: {
          btnClass: "btn-red",
          action: function action() {
            $("#result").text("Status: User Pressed Cancel");
            s3upload.cancel();
            $("#result").text("Status: User Cancelled Upload");
            toggleButtons();
          }
        }
      }
    });
  });
  $("#AbortPending").click(function () {
    if (CheckFields()) {
      $.confirm({
        content: " This will remove all pending S3 Uploads including all partial uploads. Confirm Delete?",
        title: "Heads Up",
        buttons: {
          Cancel: {
            btnClass: "btn-red"
          },
          Proceed: {
            btnClass: "btn-blue",
            action: function action() {
              setCookies();
              $("#result").text("Status: Deleting Pending Partial Uploads...");
              s3AbortPending = new AbortPending();

              s3AbortPending.onAbortPendingCompleted = function (data) {
                $("#result").text("Status: Completed Deleting " + data["count"] + " Objects.");
              };
            }
          }
        }
      });
    }
  });
  $("#EnableCORS").click(function () {
    if (CheckFields()) {
      setCookies();
      $("#result").text("Status: Enabling CORS...");
      s3SetCORS = new SetCORS();
      $("#result").text("Status: CORS Enabled on bucket " + $("#BucketName")[0].value);

      s3SetCORS.onServerError = function (command, jqXHR, textStatus, errorThrown) {
        $("#result").text("Status: Server Error." + textStatus + errorThrown);
      };
    }
  });
  $("#ResetForm").click(function () {
    $("#result").text("Status: Clearing Form...");
    alert("I'm in!");
    unsetCookies();
    $("#BucketName").value = "";
    $("#FolderName").value = "";
    $("#AccessKey").value = "";
    $("#SecretKey").value = "";
    $("#startUpload").prop("disabled", false);
    $("#cancelUpload").prop("disabled", true); //alert("I'm out!");

    $("#result").text("Status:");
  });
  /*
   * End Button Clicks processing
   */
});