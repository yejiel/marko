var expect = require("chai").expect;

module.exports = async function(helpers) {
    var namePromise = createResolvablePromise();
    helpers.mount(require.resolve("./index"), { namePromise });
    if (!helpers.isHydrate) {
        expect(helpers.targetEl.textContent).to.equal("Loading...");
        namePromise.resolve("Marko");
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(helpers.targetEl.textContent).to.equal("Hello Marko!");
};

function createResolvablePromise() {
    let resolve;
    const promise = new Promise(_resolve => (resolve = _resolve));
    promise.resolve = resolve;
    return promise;
}
