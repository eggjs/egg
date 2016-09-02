<div class="index">
  <div class="banner block index-bg-dark">
    <div class="banner-logo" id="logo"></div>
    <h1>{{ __('index.title') }}</h1>
    <p class="banner-button">
      <a class="btn btn-primary" href="/guide/">{{ __('index.getstart') }}</a>
    </p>
  </div>

  <div class="version">
    <span>Latest: <strong>0.1.0</strong></span>
    <span>Nodejs >= <strong> 4.0.0</strong></span>
  </div>

  <div class="info block index-bg-light">
    <h2 class="ft-b">{{ __('index.slogan') }}</h2>
    <ul>
      <li>
        <div class="info-img">
          <img src="/images/feature1.svg" />
        </div>
        <h3>{{ __('index.feature11') }}</h3>
        <div>{{ __('index.feature12') }}</div>
      </li>
      <li>
        <div class="info-img">
          <img src="/images/feature2.svg" />
        </div>
        <h3>{{ __('index.feature21') }}</h3>
        <div>{{ __('index.feature22') }}</div>
      </li>
      <li>
        <div class="info-img">
          <img src="/images/feature3.svg" />
        </div>
        <h3>{{ __('index.feature31') }}</h3>
        <div>{{ __('index.feature32') }}</div>
      </li>
    </ul>
  </div>

  <div class="guide block">
    <h2 class="ft-b">{{ __('index.getstart') }}</h2>
    <div class="guide-code">
      <ul>
        <li><strong>$</strong>npm install egg-init -g</li>
        <li><strong>$</strong>egg-init --type simple showcase && cd showcase</li>
        <li><strong>$</strong>npm install</li>
        <li><strong>$</strong>npm run dev</li>
        <li><strong>$</strong>open http://localhost:7001</li>
      </ul>
    </div>
    <p>
      <a class="btn btn-primary" href="/guide/">{{ __('index.readmore') }}</a>
    </p>
  </div>
</div>
<script src="/images/logo-animate.js"></script>
<script>logo('logo')</script>
