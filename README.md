# autotune

Everyone knows that A/B testing is critical to optimizing any app, but implementing tests and analyzing results can be awkward and time-consuming.

As developers, we want adding A/B tests to any app to be as simple as adding a line of code. We also want machine learning algorithms to analyze our test results and optimize our app for us, automatically, without having to think twice about it.

This is why we created `autotune`. With `autotune`, you create special variables in your program that `autotune` will automatically tune over time to improve outcomes.

Not sure whether to require login for people to browse your app? Not sure what your main call-to-action should be, or what color to use for the button? Not sure which social sharing features will be most relevant for your audience? Just make a few good guesses for each, and let `autotune` automatically find the best decisions, then make them for you.

## Examples

### "Log in" or "Sign in"?

Not sure if your main CTA should be `Log in` or `Sign in`? Let autotune pick the one that works best:

```javascript
import * as autotune from "autotune";

autotune.init("11397F73-FF90-4831-B7F7-85023F1741E4");

ReactDOM.render(
  <div>
    <h1>Welcome to my app!</h1>
    <button onClick={autotune.complete}>
      {autotune.flipCoin("cta") ? "Log in" : "Sign in"}
    </button>
  </div>,
  document.getElementById("root")
);
```

Autotune will flip a coin to decide whether to use `Log in` or `Sign in`, and over time
will favor the choice that gets more users to click the button.

### Where should we put pricing?

Not sure if your pricing information should come before or after your customer testimonials? Let autotune pick the one that works best:

```javascript
import * as autotune from "autotune";

autotune.init("11397F73-FF90-4831-B7F7-85023F1741E4");

const PricingInfo = () => (
  <div>
    ...
    <button onClick={() => { autotune.complete(); buyNow(); }>
      Buy Now
    </button>
  </div>
);

const render = () => (
  <div>
    <Header />
    <ProductFeatures />
    { autotune.flipCoin("Pricing before customer stories?") ? (
      <div>
        <PricingInfo />
        <CustomerStories />
      </div>
    ) : (
      <div>
        <CustomerStories />
        <PricingInfo />
      </div>
    )}
    <Footer />
  </div>
);
```

Again, autotune will flip a coin to decide where pricing info should display, and over time
will favor the layout that gets more users to click `Buy Now`.

### Which hero message should we use?

Here we add an autotuned welcome message to a simple React app:

```javascript
import * as autotune from "autotune";

// 1. Initialize
autotune.init("11397F73-FF90-4831-B7F7-85023F1741E4");

// 2. Create a variable
const title = autotune.oneOf(
  "👋 Please sign in.",
  "Welcome! Please sign in.",
  "Bienvenidos! Please sign in."
);

ReactDOM.render(
  <div>
    // 3. Use the variable
    <h1>{title.value}</h1>
    <button
      onClick={() =>
        /* 4. Indicate when a goal is completed */ autotune.complete()
      }
    >
      Sign in
    </button>
  </div>,
  document.getElementById("root")
);
```

Autotune will experiment with different titles on this page, and automatically tune
the app to use the title that causes the most users to click 'Sign in' over time.

### Which changes will increase shopping cart totals?

```js
// Create an experiment
const cartExperiment = autotune.experiment("Maximize cart total");

// Create some dependent variables
const offerDiscount = cartExperiment.boolean("offer discount");
const discountAmount = cartExperiment.oneOf("discount amount", [
  0.05,
  0.1,
  0.15,
  0.25
]);
const couponColor = cartExperiment.oneOf("coupon color", [
  "blue",
  "orange",
  "red"
]);

function renderUI() {
  if (offerDiscount) {
    displayCoupon(
      `We'd like to offer you a ${discountAmount * 100}% discount.`,
      { color: couponColor }
    );
  }
  // ...
}

// ... elsewhere in the file

function completePurchase(cart) {
  // Complete the experiment and specify its criterion
  cartExperiment.maximize(cart.total);
  // ...
}
```
