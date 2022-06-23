# WebRTC

1. Use ngrok for forward hostname and run the following command at the ngrok command.

   ngrok.exe http https://localhost:44372 --host-header=localhost:44372
   
   if require to add token, first you should set the following command.
   
   ngrok authtoken yourtoken

2. Add your host into client id for web application(Google Cloud Platform - Credentials) as follows:
    
   https://{ngrok host name for localhost:44372}/Account/GoogleResponse
   
   https://{ngrok host name for localhost:44372}/signin-google

   