var ComponentsContext = require("../../runtime/components/ComponentsContext");
var getComponentsContext = ComponentsContext.___getComponentsContext;

module.exports = function render(input, out) {
  var shouldPreserve = Boolean(!("i" in input) || input.i);
  var isComponent = !input.n;

  if (isComponent) {
    var ownerComponentDef = out.___assignedComponentDef;
    var ownerComponent = ownerComponentDef.___component;
    var key = out.___assignedKey;
    out.bf(key, ownerComponent, true);
  }

  if (shouldPreserve) {
    var componentsContext = getComponentsContext(out);
    var parentPreserved = componentsContext.___isPreserved;
    componentsContext.___isPreserved = true;
    input.renderBody(out);
    componentsContext.___isPreserved = parentPreserved;
  } else {
    input.renderBody(out);
  }

  if (isComponent) {
    out.ef();
  }
};
