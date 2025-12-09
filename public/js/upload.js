$(document).ready(function() {
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        const fileInput = $('#file')[0];
        if (!fileInput.files || !fileInput.files[0]) {
            $('#status').html('<div class="alert alert-danger">Please select a file</div>');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        $('#status').html('<div class="alert alert-info">Uploading and processing file...</div>');

        // Upload file and get processed content
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                if (data.success) {
                    $('#status').html('<div class="alert alert-success">File processed successfully. Launching Immersive Reader...</div>');
                    launchImmersiveReaderWithContent(data.content);
                } else {
                    $('#status').html('<div class="alert alert-danger">Error: ' + (data.error || 'Unknown error') + '</div>');
                }
            },
            error: function(xhr, status, error) {
                const errorMessage = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : error;
                $('#status').html('<div class="alert alert-danger">Upload failed: ' + errorMessage + '</div>');
            }
        });
    });
});

function launchImmersiveReaderWithContent(content) {
    // Get token and subdomain
    Promise.all([
        $.ajax({ url: '/GetTokenAndSubdomain', type: 'GET' })
    ])
    .then(function(responses) {
        const tokenData = responses[0];
        
        if (tokenData.error) {
            $('#status').html('<div class="alert alert-danger">Error getting token: ' + tokenData.error + '</div>');
            return;
        }

        const token = tokenData.token;
        const subdomain = tokenData.subdomain;

        // Prepare the data payload for Immersive Reader
        const data = {
            title: 'Uploaded Document',
            chunks: [{
                content: content,
                mimeType: 'text/html'
            }]
        };

        // Options for Immersive Reader
        const options = {
            onExit: function() {
                console.log('Immersive Reader closed');
                $('#status').html('<div class="alert alert-info">Immersive Reader closed. You can upload another file.</div>');
            },
            uiZIndex: 2000
        };

        // Launch Immersive Reader
        if (window.ImmersiveReader && window.ImmersiveReader.launchAsync) {
            window.ImmersiveReader.launchAsync(token, subdomain, data, options)
                .catch(function(error) {
                    console.error('Error launching Immersive Reader:', error);
                    $('#status').html('<div class="alert alert-danger">Error launching Immersive Reader. Check console for details.</div>');
                });
        } else {
            $('#status').html('<div class="alert alert-danger">Immersive Reader SDK not loaded. Please check your internet connection and refresh the page.</div>');
        }
    })
    .catch(function(error) {
        console.error('Error fetching token/subdomain:', error);
        $('#status').html('<div class="alert alert-danger">Error fetching token/subdomain. Check console for details.</div>');
    });
}
