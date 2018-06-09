# autotune: automatic A/B testing for any app

Everyone knows that A/B testing is critical to optimizing any app, but implementing tests and analyzing results can be awkward and time-consuming.

As developers, we want adding A/B tests to any app to be as simple as adding a line of code. We also want machine learning algorithms to analyze our test results and optimize our app for us, automatically, without having to think twice.

This is why we created Autotune. With Autotune, you create special variables in your program that Autotune will automatically tune over time to improve outcomes.

Not sure what your main call-to-action should be, or what color to use for the button? Not sure which social sharing features will be most relevant for your audience? Just make a few good guesses and let Autotune automatically discover and make the best decisions.

## Sign up and create an app

```shell
$ npm install -g autotune
$ autotune signup me@myemail.com mypa33word
# Autotune will email you a confirmation code
$ autotune confirm 123456
$ autotune login me@myemail.com mypa33word
$ autotune new-app "My first autotuned app"
```

## Examples

### Main title

Arguing with colleagues about what title to use for the homepage? Let Autotune pick the one that converts the most users:

```html
<!-- Load autotune along with what it has learned so far. -->
<script src="//js.autotune.xyz/11397f73-ff90-4831-b7f7-85023f1741e4.js"></script>

<!-- Place a few options between <autotune> tags. -->
<autotune>
  <h1>We're revolutionizing healthcare with blockchain nursing.</h1>
  <h1>We're revolutionizing local news with proximity drones.</h1>
  <h1>We're revolutionizing meme delivery with AI-based CDNs.</h1>
</autotune>

<!-- Indicate a desirable outcome with the autotune attribute. -->
<a href="/signup" autotune>Sign up</a>
```

Autotune will test the options you've given between `<autotune>` tags, and automatically favor the option that gets most users to click `Sign up`.

### "Log in" or "Sign in"?

Not sure if your main CTA should be `Log in` or `Sign in`? Let Autotune pick the one that works best:

```javascript
import * as autotune from "autotune";

autotune.initialize("11397F73-FF90-4831-B7F7-85023F1741E4").then(() => {
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
autotune.initialize("11397F73-FF90-4831-B7F7-85023F1741E4").then(() => {
    // 2. Create a variable
    const title = autotune.oneOf("Welcome message", [
        "👋 Please sign in.",
        "Welcome! Please sign in.",
        "Bienvenidos! Please sign in."
    ]);

    ReactDOM.render(
        <div>
            // 3. Use the variable
            <h1>{title.value}</h1>
            <button onClick={() => /* 4. Indicate when a goal is completed */ autotune.complete()}>Sign in</button>
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
