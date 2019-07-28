## workflow
workflow "Push" {
  on = "push"
  resolves = ["workman release"]
}

workflow "Pull Request" {
  on = "pull_request"
  resolves = ["workman check"]
}

## actions
action "npm install" {
  uses = "docker://thonatos/github-actions-nodejs"
  args = "npm install"
}

action "npm ci" {
  uses = "docker://thonatos/github-actions-nodejs"
  needs = ["npm install"]  
  args = "npm run ci"
}

## target
action "workman check" {
  uses = "thonatos/github-actions-workman@1.5.4-Marketplace"
  needs = ["npm ci"]
  args = "workman check"
  secrets = [
    "GITHUB_TOKEN",
    "NPM_TOKEN"
  ]
}

action "workman release" {
  uses = "thonatos/github-actions-workman@1.5.4-Marketplace"
  needs = ["filter master", "npm ci"]
  args = "workman release"
  secrets = [
    "GITHUB_TOKEN",
    "NPM_TOKEN"
  ]
}

## filter
action "filter master" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  secrets = ["GITHUB_TOKEN"]
  args = "branch master"
}