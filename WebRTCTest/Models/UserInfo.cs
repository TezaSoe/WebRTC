namespace WebRTCTest.Models
{
    public class UserInfo
    {
        public string UserFullName { get; set; }
        public string GoogleProfile { get; set; }
        public string UserEmail { get; set; }

        /// <summary>
        /// 0 : Available
        /// 1 : Busy
        /// 2 : Idle
        /// 3 : Offline
        /// </summary>
        public int UserStatus { get; set; }
        public string ConnectionId { get; set; }
        public bool InCall { get; set; }
    }
}
