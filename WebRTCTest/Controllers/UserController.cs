using WebRTCTest.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace WebRTCTest.Controllers
{
    [Authorize]
    [ApiController]
    [Route("[controller]")]
    public class UserController : Controller
    {
        private readonly UserManager<AppUser> userManager;
        private readonly SignInManager<AppUser> signInManager;
        public UserController(UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager)
        {

            this.userManager = userManager;
            this.signInManager = signInManager;
        }

        [HttpPost("MyInfo")]
        public async Task<IActionResult> PostMyInfo()
        {
            if (signInManager.IsSignedIn(User))
            {
                var user = await userManager.GetUserAsync(User);
                return Ok(user);
            }

            return NotFound();
        }
    }
}
