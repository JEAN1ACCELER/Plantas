document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const homeLink = document.getElementById('home-link');
    const addPlantLink = document.getElementById('add-plant-link');
    const searchLink = document.getElementById('search-link');
    const backBtn = document.getElementById('back-btn');
    
    const plantsSection = document.getElementById('plants-section');
    const addPlantSection = document.getElementById('add-plant-section');
    const searchSection = document.getElementById('search-section');
    const plantDetailSection = document.getElementById('plant-detail-section');
    
    const plantsContainer = document.getElementById('plants-container');
    const searchResults = document.getElementById('search-results');
    const plantDetailContainer = document.getElementById('plant-detail-container');
    const plantForm = document.getElementById('plant-form');
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    // Variáveis de estado
    let plants = [];
    let currentPlantId = null;
    
    // Event Listeners
    homeLink.addEventListener('click', showHome);
    addPlantLink.addEventListener('click', showAddPlantForm);
    searchLink.addEventListener('click', showSearch);
    backBtn.addEventListener('click', showHome);
    searchBtn.addEventListener('click', performSearch);
    
    plantForm.addEventListener('submit', handlePlantSubmit);
    
    // Mostrar a seção inicial ao carregar
    showHome();
    loadPlants();
    
    // Funções de navegação
    function showHome() {
        hideAllSections();
        plantsSection.classList.remove('hidden');
        loadPlants();
    }
    
    function showAddPlantForm() {
        hideAllSections();
        addPlantSection.classList.remove('hidden');
        plantForm.reset();
        currentPlantId = null;
    }
    
    function showSearch() {
        hideAllSections();
        searchSection.classList.remove('hidden');
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
    
    function showPlantDetail(plantId) {
        hideAllSections();
        plantDetailSection.classList.remove('hidden');
        loadPlantDetail(plantId);
    }
    
    function hideAllSections() {
        plantsSection.classList.add('hidden');
        addPlantSection.classList.add('hidden');
        searchSection.classList.add('hidden');
        plantDetailSection.classList.add('hidden');
    }
    
    // Funções para carregar dados
    async function loadPlants() {
        try {
            const response = await fetch('/api/plants');
            plants = await response.json();
            renderPlants(plants, plantsContainer);
        } catch (error) {
            console.error('Erro ao carregar plantas:', error);
            alert('Erro ao carregar plantas. Tente novamente mais tarde.');
        }
    }
    
    async function loadPlantDetail(plantId) {
        try {
            const response = await fetch(`/api/plants/${plantId}`);
            const plant = await response.json();
            renderPlantDetail(plant);
        } catch (error) {
            console.error('Erro ao carregar detalhes da planta:', error);
            alert('Erro ao carregar detalhes da planta. Tente novamente mais tarde.');
        }
    }
    
    // Funções de renderização
    function renderPlants(plantsArray, container) {
        container.innerHTML = '';
        
        if (plantsArray.length === 0) {
            container.innerHTML = '<p>Nenhuma planta cadastrada ainda.</p>';
            return;
        }
        
        plantsArray.forEach(plant => {
            const plantCard = document.createElement('div');
            plantCard.className = 'plant-card';
            
            let imageHTML = '<div class="plant-image-placeholder"><i class="fas fa-leaf"></i></div>';
            if (plant.image) {
                imageHTML = `<img src="${plant.image}" alt="${plant.name}" class="plant-image">`;
            }
            
            plantCard.innerHTML = `
                ${imageHTML}
                <div class="plant-info">
                    <h3>${plant.name}</h3>
                    <p class="plant-scientific">${plant.scientificName || 'Nome científico não informado'}</p>
                    <p>${plant.description.substring(0, 100)}...</p>
                    <div class="plant-actions">
                        <button class="btn btn-outline view-plant" data-id="${plant.id}">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn edit-plant" data-id="${plant.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger delete-plant" data-id="${plant.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(plantCard);
        });
        
        // Adicionar event listeners aos botões
        document.querySelectorAll('.view-plant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantId = e.target.closest('button').getAttribute('data-id');
                showPlantDetail(plantId);
            });
        });
        
        document.querySelectorAll('.edit-plant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantId = e.target.closest('button').getAttribute('data-id');
                editPlant(plantId);
            });
        });
        
        document.querySelectorAll('.delete-plant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantId = e.target.closest('button').getAttribute('data-id');
                deletePlant(plantId);
            });
        });
    }
    
    function renderPlantDetail(plant) {
        let imageHTML = '<div class="plant-image-placeholder"><i class="fas fa-leaf"></i></div>';
        if (plant.image) {
            imageHTML = `<img src="${plant.image}" alt="${plant.name}" class="plant-image">`;
        }
        
        let referencesHTML = '<p>Nenhuma referência cadastrada.</p>';
        if (plant.references && plant.references.length > 0) {
            referencesHTML = '<div class="references-list"><h4>Referências Científicas:</h4><ul>';
            plant.references.split(',').forEach(ref => {
                ref = ref.trim();
                if (ref.startsWith('http')) {
                    referencesHTML += `<li><a href="${ref}" target="_blank">${ref}</a></li>`;
                } else if (ref.startsWith('10.')) {
                    referencesHTML += `<li><a href="https://doi.org/${ref}" target="_blank">${ref}</a></li>`;
                } else {
                    referencesHTML += `<li>${ref}</li>`;
                }
            });
            referencesHTML += '</ul></div>';
        }
        
        let filesHTML = '';
        if (plant.files && plant.files.length > 0) {
            filesHTML = '<div class="file-attachments"><h4>Arquivos Anexados:</h4>';
            plant.files.forEach(file => {
                filesHTML += `
                    <a href="/uploads/${file.filename}" target="_blank" download="${file.originalname}">
                        <i class="fas fa-file-pdf"></i> ${file.originalname}
                    </a>
                `;
            });
            filesHTML += '</div>';
        }
        
        plantDetailContainer.innerHTML = `
            ${imageHTML}
            <h3>${plant.name}</h3>
            <p class="plant-scientific"><strong>Nome científico:</strong> ${plant.scientificName || 'Não informado'}</p>
            
            <div class="plant-detail">
                <h4>Descrição:</h4>
                <p>${plant.description}</p>
                
                <h4>Benefícios Medicinais:</h4>
                <p>${plant.benefits}</p>
                
                <h4>Modo de Preparo:</h4>
                <p>${plant.preparation}</p>
                
                ${referencesHTML}
                ${filesHTML}
            </div>
            
            <div class="plant-actions">
                <button class="btn edit-plant" data-id="${plant.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger delete-plant" data-id="${plant.id}">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `;
        
        // Adicionar event listeners aos botões
        plantDetailContainer.querySelector('.edit-plant').addEventListener('click', (e) => {
            const plantId = e.target.closest('button').getAttribute('data-id');
            editPlant(plantId);
        });
        
        plantDetailContainer.querySelector('.delete-plant').addEventListener('click', (e) => {
            const plantId = e.target.closest('button').getAttribute('data-id');
            deletePlant(plantId);
        });
    }
    
    // Funções de manipulação de dados
    async function handlePlantSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData();
        
        // Adicionar campos do formulário
        formData.append('name', document.getElementById('plant-name').value);
        formData.append('scientificName', document.getElementById('scientific-name').value);
        formData.append('description', document.getElementById('plant-description').value);
        formData.append('benefits', document.getElementById('plant-benefits').value);
        formData.append('preparation', document.getElementById('plant-preparation').value);
        formData.append('image', document.getElementById('plant-image').value);
        formData.append('references', document.getElementById('plant-references').value);
        
        // Adicionar arquivos
        const filesInput = document.getElementById('article-files');
        for (let i = 0; i < filesInput.files.length; i++) {
            formData.append('files', filesInput.files[i]);
        }
        
        try {
            let response;
            if (currentPlantId) {
                // Atualizar planta existente
                response = await fetch(`/api/plants/${currentPlantId}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                // Criar nova planta
                response = await fetch('/api/plants', {
                    method: 'POST',
                    body: formData
                });
            }
            
            if (response.ok) {
                alert('Planta salva com sucesso!');
                showHome();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao salvar planta');
            }
        } catch (error) {
            console.error('Erro ao salvar planta:', error);
            alert(`Erro ao salvar planta: ${error.message}`);
        }
    }
    
    async function editPlant(plantId) {
        try {
            const response = await fetch(`/api/plants/${plantId}`);
            const plant = await response.json();
            
            // Preencher o formulário
            document.getElementById('plant-name').value = plant.name;
            document.getElementById('scientific-name').value = plant.scientificName || '';
            document.getElementById('plant-description').value = plant.description;
            document.getElementById('plant-benefits').value = plant.benefits;
            document.getElementById('plant-preparation').value = plant.preparation;
            document.getElementById('plant-image').value = plant.image || '';
            document.getElementById('plant-references').value = plant.references || '';
            
            currentPlantId = plant.id;
            showAddPlantForm();
        } catch (error) {
            console.error('Erro ao carregar planta para edição:', error);
            alert('Erro ao carregar planta para edição. Tente novamente mais tarde.');
        }
    }
    
    async function deletePlant(plantId) {
        if (!confirm('Tem certeza que deseja excluir esta planta? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/plants/${plantId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Planta excluída com sucesso!');
                showHome();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao excluir planta');
            }
        } catch (error) {
            console.error('Erro ao excluir planta:', error);
            alert(`Erro ao excluir planta: ${error.message}`);
        }
    }
    
    async function performSearch() {
        const query = searchInput.value.trim();
        
        if (!query) {
            alert('Por favor, digite um termo para buscar.');
            return;
        }
        
        try {
            const response = await fetch(`/api/plants/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            renderPlants(results, searchResults);
        } catch (error) {
            console.error('Erro ao buscar plantas:', error);
            alert('Erro ao buscar plantas. Tente novamente mais tarde.');
        }
    }
});