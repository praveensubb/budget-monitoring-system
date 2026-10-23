import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-role-redirect', standalone: true, template: '<div class="loading-state"><div class="spinner"></div><p>Loading your dashboard…</p></div>' })
export class RoleRedirectComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}
  ngOnInit() { this.router.navigate([this.auth.homeRoute()], { replaceUrl: true }); }
}
