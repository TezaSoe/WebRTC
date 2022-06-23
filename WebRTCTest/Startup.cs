using WebRTCTest.Data;
using WebRTCTest.Hubs;
using WebRTCTest.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace WebRTCTest
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // MsSQLExpress Setting
            //services.AddDbContext<ApplicationDbContext>(options =>
            //    options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
            
            // SQLite Setting
            string DEFAULTDBFILE = "WebRTCTest.sqlite";
            string DB_PASSWORD = "WebRTCTest";
            //services.AddDbContext<ApplicationDbContext>(ServiceLifetime.Singleton);
            services.AddDbContext<ApplicationDbContext>(optionsBuilder =>
            {
                var conn = new SqliteConnection($"Data Source={DEFAULTDBFILE};");
                conn.Open();

                using (var command = conn.CreateCommand())
                {
                    command.CommandText = $"PRAGMA key = '{DB_PASSWORD}';";
                    command.ExecuteNonQuery();
                }
                optionsBuilder.UseSqlite(conn);
            }, ServiceLifetime.Singleton);

            //services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = false)
            //    .AddEntityFrameworkStores<ApplicationDbContext>();
            services.AddIdentity<AppUser, IdentityRole>().AddEntityFrameworkStores<ApplicationDbContext>().AddDefaultTokenProviders();

            services.AddAuthentication()
                //.AddCookie()
                .AddGoogle(opts =>
                {
                    // Google Credentials Setting
                    opts.ClientId = "664960591237-mb8ma4p6niac6te8q0usj6289h0e53qp.apps.googleusercontent.com";
                    opts.ClientSecret = "nlZi6ZdURFYl5AAuF5X1Ocfe";

                    opts.SignInScheme = IdentityConstants.ExternalScheme;
                    opts.Scope.Add("profile");
                    //opts.Events.OnCreatingTicket = (context) =>
                    //{
                    //    context.Identity.AddClaim(new Claim("image", context.User.GetValue("image").SelectToken("url").ToString()));
                    //    return Task.CompletedTask;
                    //};
                    opts.Events.OnCreatingTicket = (context) =>
                    {
                        var picture = context.User.GetProperty("picture").GetString();
                        context.Identity.AddClaim(new Claim("picture", picture));
                        return Task.CompletedTask;
                    };
                });

            services.AddControllersWithViews();
            services.AddRazorPages();

            //Cross-origin policy to accept request from localhost:44342.
            services.AddCors(options =>
            {
                options.AddPolicy("CorsPolicy",
                    x => x.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
            });

            services.AddSignalR();

            services.AddSingleton<List<User>>();
            services.AddSingleton<List<UserCall>>();
            services.AddSingleton<List<CallOffer>>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseDatabaseErrorPage();

                app.Use(async (context, next) =>
                {
                    string newUri = "5b55-2400-2412-e02-6100-1d97-5d95-7a56-dc4.ngrok.io";
                    var url = context.Request.Path.Value;

                    // Rewrite to base url
                    if (url.Contains("/Account/GoogleLogin"))
                    {
                        context.Request.Host = new HostString(newUri);
                    }

                    // Rewrite to base url
                    if (url.Contains("/signin-google"))
                    {
                        context.Request.Host = new HostString(newUri);
                    }

                    await next();
                });
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseFileServer();
            app.UseCors("CorsPolicy");

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapRazorPages();
                endpoints.MapHub<ConnectionHub>("/ConnectionHub", options =>
                {
                    options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.WebSockets;
                });
            });
        }
    }
}
