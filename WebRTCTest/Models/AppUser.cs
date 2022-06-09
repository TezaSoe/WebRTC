using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace WebRTCTest.Models
{
    public class AppUser : IdentityUser
    {
        [StringLength(256)]
        public string FullName { get; set; }

        [StringLength(128)]
        public string FirstName { get; set; }

        [StringLength(128)]
        public string LastName { get; set; }

        public string GoogleProfile { get; set; }

        public string ProfilePicture { get; set; }

        /// <summary>
        /// 0 : Available
        /// 1 : Busy
        /// 2 : Idle
        /// 3 : Offline
        /// </summary>
        public int ActiveStatus { get; set; }
    }
}
