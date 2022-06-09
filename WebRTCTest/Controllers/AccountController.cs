using WebRTCTest.Models;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;

namespace WebRTCTest.Controllers
{
    [Authorize]
    public class AccountController : Controller
    {
        private readonly UserManager<AppUser> userManager;
        private readonly SignInManager<AppUser> signInManager;
        public AccountController(UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager)
        {

            this.userManager = userManager;
            this.signInManager = signInManager;
        }

        [HttpGet, AllowAnonymous]
        public IActionResult Register()
        {
            UserRegistration model = new UserRegistration();
            return View(model);
        }

        [HttpPost, AllowAnonymous]
        public async Task<IActionResult> Register(UserRegistration request)
        {
            if (ModelState.IsValid)
            {
                var userCheck = await userManager.FindByEmailAsync(request.Email);
                if (userCheck == null)
                {
                    var user = new AppUser
                    {
                        UserName = request.Email,
                        NormalizedUserName = request.Email,
                        Email = request.Email,
                        EmailConfirmed = false,
                        PhoneNumberConfirmed = false,
                    };
                    var result = await userManager.CreateAsync(user, request.Password);
                    if (result.Succeeded)
                    {
                        return RedirectToAction("Login");
                    }
                    else
                    {
                        if (result.Errors.Count() > 0)
                        {
                            foreach (var error in result.Errors)
                            {
                                ModelState.AddModelError("message", error.Description);
                            }
                        }
                        return View(request);
                    }
                }
                else
                {
                    ModelState.AddModelError("message", "Email already exists.");
                    return View(request);
                }
            }
            return View(request);
        }

        //[HttpGet]
        //[AllowAnonymous]
        //public IActionResult Login(string returnUrl)
        //{
        //    UserLogin login = new UserLogin();
        //    login.ReturnUrl = returnUrl;
        //    return View(login);
        //}

        [HttpGet]
        [AllowAnonymous]
        public IActionResult Login()
        {
            UserLogin model = new UserLogin();
            return View(model);
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Login(UserLogin model)
        {
            if (ModelState.IsValid)
            {
                var user = await userManager.FindByEmailAsync(model.Email);
                if (user != null && !user.EmailConfirmed)
                {
                    ModelState.AddModelError("message", "Email not confirmed yet");
                    return View(model);

                }
                if (await userManager.CheckPasswordAsync(user, model.Password) == false)
                {
                    ModelState.AddModelError("message", "Invalid credentials");
                    return View(model);

                }

                var result = await signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, true);

                if (result.Succeeded)
                {
                    await userManager.AddClaimAsync(user, new Claim("UserRole", "Admin"));
                    return RedirectToAction("Dashboard");
                }
                else if (result.IsLockedOut)
                {
                    return View("AccountLocked");
                }
                else
                {
                    ModelState.AddModelError("message", "Invalid login attempt");
                    return View(model);
                }
            }
            return View(model);
        }

        [Authorize]
        public IActionResult Dashboard()
        {
            return View();
        }

        [AllowAnonymous]
        public IActionResult GoogleLogin()
        {
            string redirectUrl = Url.Action("GoogleResponse", "Account");
            var properties = signInManager.ConfigureExternalAuthenticationProperties("Google", redirectUrl);
            //return new ChallengeResult("Google", properties);
            return new ChallengeResult(GoogleDefaults.AuthenticationScheme, properties);
        }

        [Authorize]
        public async Task<IActionResult> MyAccount()
        {
            if (signInManager.IsSignedIn(User))
            {
                //var name = User.Identity.Name;
                var user = await userManager.GetUserAsync(User);
                string[] userInfo = { user.FullName, user.Email };
                if (userInfo != null)
                {
                    return View("GoogleResponse", userInfo);
                }
            }

            return View("GoogleResponse");
        }

        [HttpGet("google-redirect")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleResponse()
        {
            ExternalLoginInfo info = await signInManager.GetExternalLoginInfoAsync();
            if (info == null)
                return RedirectToAction(nameof(Login));

            var pictureUrl = info.Principal.FindFirstValue("picture");
            string base64String = null;
            using (var webClient = new WebClient())
            {
                byte[] imageBytes = webClient.DownloadData(pictureUrl);
                // Convert byte[] to Base64 String
                base64String = Convert.ToBase64String(imageBytes);
            }

            var result = await signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, false);
            string[] userInfo = { info.Principal.FindFirst(ClaimTypes.Name).Value, info.Principal.FindFirst(ClaimTypes.Email).Value };
            if (result.Succeeded)
            {
                try
                {
                    var user = await userManager.FindByEmailAsync(info.Principal.FindFirst(ClaimTypes.Email).Value);
                    if (!user.GoogleProfile.Equals(base64String))
                    {
                        user.GoogleProfile = base64String;
                        await userManager.UpdateAsync(user);
                    }
                }
                catch (Exception)
                {
                }
                return RedirectToAction("Index", "Home");
                //return View(userInfo);
            }
            else
            {
                AppUser user = new AppUser
                {
                    Email = info.Principal.FindFirst(ClaimTypes.Email).Value,
                    UserName = info.Principal.FindFirst(ClaimTypes.Email).Value,
                    FullName = info.Principal.FindFirst(ClaimTypes.Name).Value,
                    GoogleProfile = base64String
                };

                IdentityResult identResult = await userManager.CreateAsync(user);
                if (identResult.Succeeded)
                {
                    identResult = await userManager.AddLoginAsync(user, info);
                    if (identResult.Succeeded)
                    {
                        await signInManager.SignInAsync(user, false);
                        return RedirectToAction("Index", "Home");
                        //return View(userInfo);
                    }
                }
                return AccessDenied();
                //return View(userInfo);
            }
        }

        public IActionResult AccessDenied()
        {
            return View();
        }

        public async Task<IActionResult> Logout()
        {
            await signInManager.SignOutAsync();
            return RedirectToAction("login", "account");
        }
    }
}
