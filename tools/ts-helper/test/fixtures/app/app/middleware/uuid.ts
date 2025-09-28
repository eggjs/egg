export default function() {
  return async (context, next) => {
    await next();
  };
}
