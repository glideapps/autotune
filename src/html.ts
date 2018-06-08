import { OptionValue, oneOf } from ".";
import { map, each } from "./util";

type AttributeExperiments = {
  [name: string]: {
    options: OptionValue[];
    nodes: Element[];
  };
};

type TagExperiments = {
  [name: string]: Array<{
    options: OptionValue[];
    node: Element;
  }>;
};

function hash(s: string): number {
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    var character = s.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function optionNodeLabelOrText(node: Element): string {
  return node.getAttribute("option") || hash(node.outerHTML).toString();
}

// Gather tag-based experiments like:
//
//   <autotune>
//     <h1>Hello!</h1>
//     <h1>¡Hola!</h1>
//   </autotune>
//
// Or more explicitly:
//
//   <autotune experiment="main title">
//     <h1 option="english">Hello!</h1>
//     <h1 option="spanish">¡Hola!</h1>
//   </autotune>
//
function getTagExperiments(): TagExperiments {
  let experiments: TagExperiments = {};

  const customTagNodes = document.getElementsByTagName("autotune");
  each(customTagNodes, node => {
    const name =
      node.getAttribute("experiment") ||
      // We use the hash of the experiment's HTML content if no name is provided
      hash(node.innerHTML).toString();
    const data = { node, options: map(node.children, optionNodeLabelOrText) };
    const list = experiments[name] || [];
    list.push(data);
    experiments[name] = list;
  });
  return experiments;
}

// Gather attribute-based experiments like:
//
//   <h1 data-experiment="hero" data-option="a">Welcome!</h1>
//   <h1 data-experiment="hero" data-option="b">¡Bienvenidos!</h1>
//
function getAttributeExperiments(): AttributeExperiments {
  let experiments: AttributeExperiments = {};
  const attributedNodes = document.querySelectorAll("[data-experiment]");
  each(attributedNodes, node => {
    const name = node.getAttribute("data-experiment");
    const option = node.getAttribute("data-option");

    let data = experiments[name];
    if (data === undefined) {
      data = experiments[name] = { options: [], nodes: [] };
    }
    if (data.options.indexOf(option) === -1) {
      data.options.push(option);
    }
    data.nodes.push(node);
  });
  return experiments;
}

export function startHTMLExperiments() {
  // DOMContentLoaded is well-supported in modern browsers, but we may need a more backwards-compat solution
  // What if DOM content is already loaded?
  document.addEventListener("DOMContentLoaded", gatherAndStartDOMExperiments);
}

function gatherAndStartDOMExperiments() {
  const attributeExperiments = getAttributeExperiments();
  const tagExperiments = getTagExperiments();

  Object.getOwnPropertyNames(attributeExperiments).forEach(name => {
    const { options, nodes } = attributeExperiments[name];
    const choice = oneOf(name, options);
    nodes.forEach(node => {
      if (node.getAttribute("data-option") !== choice) {
        node.remove();
      }
    });
  });

  Object.getOwnPropertyNames(tagExperiments).forEach(name => {
    let options: { [value: string]: null } = {};
    // Gather unique option values
    tagExperiments[name].forEach(experiment => {
      experiment.options.forEach(o => (options[o] = null));
    });
    const choice = oneOf(name, Object.getOwnPropertyNames(options));
    tagExperiments[name].forEach(experiment => {
      map(experiment.node.children, x => x).forEach(child => {
        if (optionNodeLabelOrText(child) !== choice) {
          child.remove();
        }
      });
    });
  });
}
