// tslint:disable strict-boolean-expressions

import { oneOf, complete } from ".";
import { map, each, hash, unique } from "./util";

type AttributeExperiments = {
    [name: string]: {
        options: string[];
        nodes: Element[];
    };
};

type TagExperiments = {
    [name: string]: Array<{
        options: string[];
        node: Element;
    }>;
};

type ClassExperiments = {
    [name: string]: {
        options: string[];
        node: Element;
    };
};

export function optionNodeLabelOrText(
    node: Element,
    allowTextContent: "allow textContent" | "no textContent" = "allow textContent"
): string {
    return (
        node.getAttribute("data-option") ||
        node.getAttribute("option") ||
        (allowTextContent ? node.textContent : undefined) ||
        hash(node.outerHTML).toString()
    );
}

export function optionsForNodeChildren(children: HTMLCollection): string[] {
    let options = unique(map(children, c => optionNodeLabelOrText(c)));
    if (options.length !== children.length) {
        options = map(children, c => optionNodeLabelOrText(c, "no textContent"));
    }
    return options;
}

// Gather tag-based experiments like:
//
//   <x-autotune>
//     <h1>Hello!</h1>
//     <h1>¡Hola!</h1>
//   </x-autotune>
//
// Or more explicitly:
//
//   <autotune experiment="main title">
//     <h1 option="english">Hello!</h1>
//     <h1 option="spanish">¡Hola!</h1>
//   </x-autotune>
//
function getTagExperiments(): TagExperiments {
    let experiments: TagExperiments = {};

    const customTagNodes = document.getElementsByTagName("x-autotune");
    each(customTagNodes, node => {
        const name =
            node.getAttribute("data-experiment") ||
            node.getAttribute("experiment") ||
            // We use the hash of the experiment's HTML content if no name is provided
            hash(node.innerHTML).toString();
        const data = { node, options: optionsForNodeChildren(node.children) };
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

        if (name === null || option === null) return;

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

// Gather attribute-based class experiments like:
//
//   <button autotune-class="green blue purple">Sign up</button>
//
function getClassAttributeExperiments(): ClassExperiments {
    let experiments: ClassExperiments = {};
    const attributedNodes = document.querySelectorAll("[autotune-class],[data-autotune-class]");
    each(attributedNodes, node => {
        const classesRaw = node.getAttribute("autotune-class") || node.getAttribute("data-autotune-class") || "";
        const classes = classesRaw.split(" ");
        const experimentName =
            node.getAttribute("autotune-experiment") ||
            node.getAttribute("data-autotune-experiment") ||
            `${hash(node.innerHTML)}-class`;
        experiments[experimentName] = { options: classes, node };
    });
    return experiments;
}

export function startHTMLExperiments() {
    function start() {
        gatherAndStartDOMExperiments();
        setupHTMLCompletions();
    }

    if (document.readyState === "complete") {
        start();
    } else {
        // DOMContentLoaded is well-supported in modern browsers, but we may need a more backwards-compat solution
        document.addEventListener("DOMContentLoaded", () => {
            start();
        });
    }
}

function setupHTMLCompletions() {
    const clickables: NodeListOf<HTMLAnchorElement | HTMLButtonElement> = document.querySelectorAll(
        "a[autotune],a[data-autotune],button[autotune],button[data-autotune]"
    );
    each(clickables, clickable => {
        const onclick = clickable.onclick;
        clickable.onclick = event => {
            event.preventDefault();
            complete(() => {
                if (typeof onclick === "function") {
                    onclick.bind(clickable)(event);
                } else if (clickable instanceof HTMLAnchorElement) {
                    window.location.href = clickable.href;
                }
            });
        };
    });
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
            map(experiment.node.children, x => x) // ensure we're not mutating collection as we iterate
                .forEach(child => {
                    if (optionNodeLabelOrText(child) !== choice) {
                        child.remove();
                    }
                });
        });
    });

    const classExperiments = getClassAttributeExperiments();
    Object.getOwnPropertyNames(classExperiments).forEach(name => {
        const experiment = classExperiments[name];
        const pick = oneOf(name, experiment.options);
        experiment.node.classList.add(pick);
    });
}
