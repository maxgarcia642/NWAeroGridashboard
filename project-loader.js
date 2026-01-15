// Load projects and resume dynamically
// Supports both local content.json (GitHub Pages) and Replit API fallback
document.addEventListener('DOMContentLoaded', async () => {
  const REPLIT_URL = 'https://workspace.maxgarcia642.repl.co'; 
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  let data = null;
  
  // Try to load from local content.json first (preferred for GitHub Pages)
  try {
    const localRes = await fetch('./content.json');
    if (localRes.ok) {
      data = await localRes.json();
      console.log('Loaded content from local content.json');
    }
  } catch (e) {
    console.log('Local content.json not available, trying API...');
  }
  
  // Fallback to Replit API if local content.json didn't work
  if (!data) {
    try {
      const API_URL = isGitHubPages ? REPLIT_URL + '/api' : '/api';
      const res = await fetch(`${API_URL}/content`);
      if (res.ok) {
        data = await res.json();
        console.log('Loaded content from API');
      }
    } catch (e) {
      console.log('API not available');
    }
  }
  
  // If no data loaded, use defaults
  if (!data) {
    console.log('Using default content');
    return;
  }
  
  // Determine base URL for uploads
  const BASE_URL = isGitHubPages ? '' : (data.projects ? '' : REPLIT_URL);
  
  // Load resume if available
  if (data.resumeFile) {
    const resumeFrame = document.getElementById('resumeFrame');
    const resumeDownload = document.getElementById('resumeDownload');
    const resumePath = `${BASE_URL}/uploads/${data.resumeFile}`;
    
    if (resumeFrame) {
      resumeFrame.src = resumePath;
    }
    if (resumeDownload) {
      resumeDownload.href = resumePath;
    }
  }
  
  // Load projects
  const projectTrack = document.getElementById('projectTrack');
  if (projectTrack && data.projects && data.projects.length > 0) {
    // Sort projects by dateUpdated (most recent first)
    const sortedProjects = [...data.projects].sort((a, b) => {
      const dateA = new Date(a.dateUpdated || a.dateAdded || 0);
      const dateB = new Date(b.dateUpdated || b.dateAdded || 0);
      return dateB - dateA; // Most recent first
    });
    
    // Limit to 100 projects max
    const limitedProjects = sortedProjects.slice(0, 100);
    
    projectTrack.innerHTML = '';
    
    limitedProjects.forEach((project, idx) => {
      // Skip projects without valid files or drive links
      if ((!project.file && !project.driveLink) || !project.title) return;
      
      // Prioritize driveLink over file if both exist
      let fileUrl;
      let originalUrl = null; // Store original URL for opening in new tab
      let isGoogleDocs = false;
      
      if (project.driveLink) {
        originalUrl = project.driveLink;
        isGoogleDocs = project.driveLink.includes('docs.google.com') || project.driveLink.includes('drive.google.com');
        
        // Convert Google Docs/Drive sharing links to embeddable preview format
        // Handle both /edit and /view variants with or without query parameters
        // If already in /preview format, leave it unchanged
        fileUrl = project.driveLink;
        if (!fileUrl.includes('/preview')) {
          // Extract file ID from Google Docs/Drive URL
          const docIdMatch = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (docIdMatch && docIdMatch[1]) {
            const fileId = docIdMatch[1];
            if (fileUrl.includes('docs.google.com/document')) {
              // Google Docs document
              fileUrl = `https://docs.google.com/document/d/${fileId}/preview`;
            } else if (fileUrl.includes('docs.google.com/spreadsheets')) {
              // Google Sheets
              fileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
            } else if (fileUrl.includes('docs.google.com/presentation')) {
              // Google Slides
              fileUrl = `https://docs.google.com/presentation/d/${fileId}/preview`;
            } else if (fileUrl.includes('drive.google.com')) {
              // Generic Drive file
              fileUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            } else {
              // Fallback: try to replace /edit or /view with /preview
              fileUrl = fileUrl
                .replace(/\/edit(\?.*)?$/, '/preview')
                .replace(/\/view(\?.*)?$/, '/preview');
            }
          } else {
            // Fallback: try to replace /edit or /view with /preview
            fileUrl = fileUrl
              .replace(/\/edit(\?.*)?$/, '/preview')
              .replace(/\/view(\?.*)?$/, '/preview');
          }
        }
      } else if (project.file) {
        fileUrl = `${BASE_URL}/uploads/${project.file}`;
        originalUrl = fileUrl;
      }
      
      const article = document.createElement('article');
      article.className = 'post-card';
      article.setAttribute('role', 'listitem');
      article.setAttribute('tabindex', '0');
      article.setAttribute('data-src', fileUrl);
      article.setAttribute('data-original-url', originalUrl || fileUrl);
      article.setAttribute('data-is-googledocs', isGoogleDocs ? 'true' : 'false');
      article.setAttribute('data-id', project.id || idx + 1);
      
      // Format date for display
      const displayDate = project.dateUpdated ? 
        new Date(project.dateUpdated).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : '';
      
      article.innerHTML = `
        <div class="post-preview">
          <iframe src="${fileUrl}" title="${project.title} preview" loading="lazy" allow="fullscreen; clipboard-read; clipboard-write"></iframe>
        </div>
        <h3>${project.title}</h3>
        <p class="muted">${project.description || ''}</p>
        ${displayDate ? `<p class="muted small" style="font-size:0.75rem;opacity:0.7">Updated: ${displayDate}</p>` : ''}
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn ghost expand-btn" type="button" aria-label="Open ${project.title}">Expand</button>
          ${isGoogleDocs ? `<a href="${originalUrl}" target="_blank" rel="noopener" class="btn ghost" style="text-decoration: none;">Open in Docs</a>` : ''}
        </div>
      `;
      projectTrack.appendChild(article);
    });
    
    // Re-initialize carousel after loading projects
    setTimeout(() => {
      if (typeof initCarousel === 'function') {
        initCarousel();
      }
    }, 100);
  } else {
    // No projects available - show placeholder message
    if (projectTrack) {
      projectTrack.innerHTML = `
        <article class="post-card" role="listitem" style="min-width:100%;text-align:center;padding:40px 20px">
          <h3>No Projects Yet</h3>
          <p class="muted">Projects will appear here once you add PDF files to the uploads folder and update content.json.</p>
          <p class="muted small">See uploads/README.md for instructions.</p>
        </article>
      `;
    }
  }
});
