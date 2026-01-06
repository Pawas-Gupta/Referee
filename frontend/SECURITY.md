# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by:

1. **Do not** create a public GitHub issue
2. Email the maintainers directly
3. Include detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Security Measures

### Development Dependencies
- Regular dependency updates
- Automated vulnerability scanning
- Use of npm audit for security checks

### Runtime Security
- Input validation on all user inputs
- HTTPS enforcement in production
- Content Security Policy headers
- XSS protection headers

### Known Issues
- webpack-dev-server vulnerabilities: These are development-only dependencies and do not affect production builds
- Regular monitoring and updates are performed to address security issues

## Security Best Practices

When deploying this application:

1. **Use HTTPS** - Always serve the application over HTTPS in production
2. **Environment Variables** - Never commit sensitive data to version control
3. **Content Security Policy** - Implement CSP headers
4. **Regular Updates** - Keep dependencies updated
5. **Security Headers** - Implement security headers in your web server

## Production Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Environment variables secured
- [ ] Dependencies updated
- [ ] Build artifacts scanned
- [ ] Access logs monitored