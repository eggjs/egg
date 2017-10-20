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
- ensurance of maintain code quality
- correctness of refactor
- confidence
- automatic running

It's more important to use unit test in web application during the fast iteration, because each testing case can contributes to increase the stability of the application. The result of various inputs in each test is definite, so it's obvious whether the changed code has an impact on correctness or not.

Therefore, such as Controller, Service, Helper, Extend and so on, code require corresponding unit testing for quality assurances, espcailly modification of framework or plugin, of which test coverage is strongly recommended to be 100%.