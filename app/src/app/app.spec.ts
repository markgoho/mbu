import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import { App } from './app';

@Component({
  imports: [App],
  template: '<app-root />',
})
class TestHost {}

describe('App', () => {
  it('boots and renders the router outlet', async () => {
    await render(TestHost, {
      providers: [provideRouter([])],
    });

    expect(document.querySelector('router-outlet')).toBeTruthy();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
