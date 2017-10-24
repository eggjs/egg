title: Unit Testing
---

## Why Unit Testing

Let's start with a few questions:

- How to measure the quality of code
- How to ensure the quality of code
- Are you free to refactor code
- How to guarantee the correctness of refactored code
- Dare you to release your code without tests

If you hesitate, you probably need unit testing.

Actually, it brings us tremendous profits:
- ensurance of maintaining code quality
- correctness of refactor
- confidence
- automatic running

It's more important to use unit test in web application during the fast iteration, because each testing case can contribute to increase the stability of the application. The result of various inputs in each test is definite, so it's obvious whether the changed code has an impact on correctness or not.

Therefore, such as Controller, Service, Helper, Extend and so on, code requires corresponding unit testing for quality assurances, especially modification of framework or plug-in, of which test coverage is strongly recommended to be 100%.

## Test Framework

When [searching 'test framework' in npm](https://www.npmjs.com/search?q=test%20framework&page=1&ranking=popularity), there are a mass of test frameworks owning their own unique characteristics.
### Mocha

Mocha is our first choice.

> Mocha is a feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun. Mocha tests run serially, allowing for flexible and accurate reporting, while mapping uncaught exceptions to the correct test cases.

And it's more efficient to use with another module [co-mocha](https://npmjs.com/co-mocha), which provides multiple ways of implementation, such as generator function and async await.

### AVA

Why not another recently popular framework [AVA](https://github.com/avajs/ava), it looks like faster ?AVA looks great, but practice tells us the truth that it actually makes code harder to write.

Comments from [@dead-horse](https://github.com/dead-horse):
> - AVA is not stable enough, for example, CPU capacity is going to be overloaded when plenty of files are running concurrently. The solution of setting parameter controlling concurrent could work, but 'only mode' would be not functioning.
> - Running cases concurrently makes great demands on code, because each test has to be independent, and it is difficult to implement especially do some mocking work
> - Considering the expensive initialization of app, it's irrational of AVA to execute each file in an independent process initializing their own app while serial framework does only one time.

Comments from [@fool2fish](https://github.com/fool2fish)：
> - It's faster to use AVA in simple application(maybe too simple to judge). But it's not recommended to use in complicate one because of its considerable flaws, such as incapability of offering accurate error stacks; meanwhile, concurrency may cause service relying on other test settings to hang up which reduces the success rate of the test. So process testing, for example, CRUD operations of database, should not use AVA.
