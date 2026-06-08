# Repository branding

GitHub does not use a repository icon from a committed file automatically. The repository owner has to set the visual assets in GitHub settings.

## Repository social preview

Use this file as the GitHub repository social preview image:

```text
./docs/branding/repository-social-preview.png
```

Steps:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Open **General**.
4. Scroll to **Social preview**.
5. Click **Edit** or **Upload image**.
6. Upload `docs/branding/repository-social-preview.png`.
7. Save.

GitHub recommends a wide image for the social preview. The included file is `1280x640`, which works well when the repository is shared in chat, Discord, GitHub search previews, and social cards.

## Small icon/avatar

Use this file anywhere a square repository/product icon is needed:

```text
./docs/branding/repository-icon.png
```

GitHub repositories do not have their own small avatar separate from the owner or organization avatar. To show this as the small icon next to the repository name, set it as the **organization/user avatar** that owns the repository. If that is not appropriate, keep it in the README and release pages instead.

Recommended uses:

- GitHub organization avatar, if the organization is dedicated to MCDF Manager;
- release notes header image;
- README hero image;
- external download page favicon/social icon;
- Discord announcement embed image.
