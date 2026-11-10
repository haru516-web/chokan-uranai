module.exports = ({ config }) => {
  const baseUrl = process.env.CHOKAN_WEB_BASE_URL;
  if (!baseUrl) return config;

  return {
    ...config,
    experiments: { ...config.experiments, baseUrl },
  };
};
