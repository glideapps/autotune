![](logo.svg)

# Automatically improve your apps & web sites

A/B testing is critical to optimizing any app, but implementing tests and analyzing results can be awkward and time-consuming.

As developers, we want adding A/B tests to any app to be as simple as adding a line of code. We also want machine learning algorithms to analyze our test results and optimize our app for us, automatically, without having to think twice.

This is why we created Autotune. With Autotune, you create special variables in your program that Autotune will automatically tune over time to improve outcomes.

Not sure what your main call-to-action should be, or what color to use for the button? Just make a few good guesses and Autotune will make the best decision.

## Create an account and your first app

```shell
$ npm install -g autotune
$ tune signup <email> <password> # Autotune will email you a confirmation code
$ tune confirm <code>            # Autotune will give you a code sample
```

## Examples

### Basic Tutorial

Once you've created an app, add a `<script>` tag in your page's `<head>` section. This loads the `autotune` library, data about your experiments so far, and initializes `autotune`:

```html
<head>
    <!-- ... -->
    <script src="https://js.autotune.xyz/YOUR-APP-KEY.js"></script>
</head>
```

Next, create an experiment anywhere on your page:

```html
<!-- Shorthand syntax -->
<autotune>
    <h1>The glass is half full</h1>
    <h1>The glass is half empty</h1>
</autotune>

<!-- Same but more explicit -->
<autotune experiment="Main title">
    <h1 option="half full">The glass is half full</h1>
    <h1 option="half empty">The glass is half empty</h1>
</autotune>

<!-- Without custom tags (most compatible) -->
<h1 data-experiment="Main title" data-option="half full">The glass is half full</h1>
<h1 data-experiment="Main title" data-option="half empty">The glass is half empty</h1>
```

Finally, add the `autotune` attribute to links you want users to click:

```html
<!-- Shorthand syntax -->
<a href="/buy-now" autotune>Buy now</a>

<!-- Using standard custom attribute -->
<a href="/buy-now" data-autotune>Buy now</a>
```

Autotune will decide which `<h1>` to display, and favor the choice that causes most users to click `Buy now`.

### Autotuned styles

Use the `autotune-class` attribute to let Autotune apply the CSS class that performs the best:

```html
<style>
.clean      { ... }
.busy       { ... }
.extra-busy { ... }
</style>

<body autotune-class="clean busy extra-busy">
  ...
</body>
```

Autotune will randomly assign either the `clean`, `busy`, or `extra-busy` class to your `body` tag, and then begin to favor the class that performs the best.

## JavaScript API

### "Log in" or "Sign in"?

Not sure if your main CTA should be `Log in` or `Sign in`? Let Autotune pick the one that works best:

```javascript
import * as autotune from "autotune";

autotune.initialize("11397F73-FF90-4831-B7F7-85023F1741E4", () => {
    ReactDOM.render(
        <div>
            <h1>Welcome to my app!</h1>
            <button onClick={autotune.complete}>{autotune.flipCoin("cta") ? "Log in" : "Sign in"}</button>
        </div>,
        document.getElementById("root")
    );
});
```

Autotune will flip a coin to decide whether to use `Log in` or `Sign in`, and over time
will favor the choice that gets more users to click the button.

### Which hero message should we use?

Here we add an autotuned welcome message to a simple React app:

```javascript
import * as autotune from "autotune";

// 1. Initialize
autotune.initialize("11397F73-FF90-4831-B7F7-85023F1741E4", () => {
    // 2. Create a variable
    const title = autotune.oneOf("Welcome message", [
        "👋 Please sign in.",
        "Welcome! Please sign in.",
        "Bienvenidos! Please sign in."
    ]);

    ReactDOM.render(
        <div>
            // 3. Use the variable
            <h1>{title}</h1>
            <button onClick={() => /* 4. Indicate success */ autotune.complete()}>Sign in</button>
        </div>,
        document.getElementById("root")
    );
});
```

Autotune will experiment with different titles on this page, and automatically tune
the app to use the title that causes the most users to click 'Sign in' over time.

## Development

```shell
$ npm install
$ npm start
```
