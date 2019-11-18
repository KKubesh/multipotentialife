function overrideTsLoader(config, env) {
    const oneOfRules = config.module.rules.find(rule => rule.oneOf);
    const tsRule = oneOfRules.oneOf.find(
      rule => rule.use && rule.use.find(
        usage => usage.loader && usage.loader.indexOf('ts-loader') > 0
      )
    );
  
    const isDev = process.env.NODE_ENV !== 'production';
  
    tsRule.use.unshift({
      loader: require.resolve('babel-loader'),
      options: {
        plugins: [
          [
            require.resolve('babel-plugin-emotion'), {
            hoist: !isDev,
            autoLabel: isDev,
          }
          ]
        ]
      }
    });
  
    return config;
  }
  
  module.exports = function override(config, env) {
    config = overrideTsLoader(config, env);
  
    // console.log(JSON.stringify(config, null, ' '));
  
    return config;
  };