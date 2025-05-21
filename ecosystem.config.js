module.exports = {
    apps: [
      {
        name: "guttihub",
        script: "npm",
        args: "run start",
        env: {
          NODE_ENV: "development",
          PORT: 3000
        },
        env_production: {
          NODE_ENV: "production",
          PORT: 6301
        }
      }
    ]
  };
  