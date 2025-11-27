import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { FaDatabase, FaUpload, FaArrowLeft, FaCheckCircle, FaDownload, FaShieldAlt } from "react-icons/fa";
import { buildApiUrl } from "../api/constants";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const RestaurarDB = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".db")) {
        setFile(selectedFile);
      } else {
        toast.error("Por favor selecciona un archivo .db válido");
        e.target.value = "";
      }
    }
  };

  const handleBackup = async () => {
    try {
      const token = getCookie("token") || localStorage.getItem("token") || "";
      const response = await fetch(buildApiUrl("/database/backup"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error("Error al crear respaldo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("✅ Respaldo descargado exitosamente");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear respaldo");
    }
  };

  const handleRestore = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo .db");
      return;
    }

    const confirmRestore = window.confirm(
      "⚠️ ADVERTENCIA: Esta acción reemplazará TODA la base de datos actual. ¿Estás seguro de continuar?"
    );

    if (!confirmRestore) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("database", file);

    try {
      const token = getCookie("token") || localStorage.getItem("token") || "";
      const response = await fetch(buildApiUrl("/database/restore"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al restaurar la base de datos");
      }

      const result = await response.json();
      toast.success("✅ Base de datos restaurada exitosamente");
      
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al restaurar la base de datos"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <ToastContainer />
      <Header>
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Volver
          </button>
          <div>
            <h1>Restaurar Base de Datos</h1>
          </div>
        </div>
      </Header>

      <Content>
        <MainCard>
          <IconCircle>
            <FaDatabase />
          </IconCircle>
          
          <Title>Restauración de Base de Datos</Title>
          <Subtitle>Gestiona tus respaldos de forma segura</Subtitle>

          <StepsContainer>
            <StepCard>
              <StepNumber>1</StepNumber>
              <StepContent>
                <StepTitle><FaShieldAlt /> Crear Respaldo</StepTitle>
                <StepDescription>Descarga un respaldo de seguridad de tu base de datos actual</StepDescription>
                <BackupButton onClick={handleBackup}>
                  <FaDownload /> Descargar Respaldo Actual
                </BackupButton>
              </StepContent>
            </StepCard>

            <Divider>
              <DividerLine />
              <DividerText>Luego</DividerText>
              <DividerLine />
            </Divider>

            <StepCard>
              <StepNumber>2</StepNumber>
              <StepContent>
                <StepTitle><FaUpload /> Seleccionar Archivo</StepTitle>
                <StepDescription>Elige el archivo .db que deseas restaurar</StepDescription>
                <FileInput>
                  <input
                    type="file"
                    accept=".db"
                    onChange={handleFileChange}
                    id="file-upload"
                    disabled={loading}
                  />
                  <label htmlFor="file-upload" className={file ? "has-file" : ""}>
                    <FaUpload /> {file ? "Cambiar archivo" : "Seleccionar archivo .db"}
                  </label>
                </FileInput>

                {file && (
                  <FileName>
                    <FaCheckCircle /> <strong>{file.name}</strong>
                    <FileSize>{(file.size / 1024 / 1024).toFixed(2)} MB</FileSize>
                  </FileName>
                )}
              </StepContent>
            </StepCard>

            <Divider>
              <DividerLine />
              <DividerText>Finalmente</DividerText>
              <DividerLine />
            </Divider>

            <StepCard>
              <StepNumber>3</StepNumber>
              <StepContent>
                <StepTitle><FaDatabase /> Restaurar</StepTitle>
                <StepDescription>Confirma y ejecuta la restauración de la base de datos</StepDescription>
                <ButtonGroup>
                  <RestoreButton
                    onClick={handleRestore}
                    disabled={!file || loading}
                  >
                    {loading ? (
                      <>
                        <Spinner /> Restaurando...
                      </>
                    ) : (
                      <>
                        <FaDatabase /> Restaurar Base de Datos
                      </>
                    )}
                  </RestoreButton>
                  
                  <CancelButton onClick={() => navigate(-1)} disabled={loading}>
                    Cancelar
                  </CancelButton>
                </ButtonGroup>
              </StepContent>
            </StepCard>
          </StepsContainer>

          <InfoBox>
            <strong>💡 Información importante:</strong>
            <ul>
              <li>El sistema creará automáticamente un respaldo antes de restaurar</li>
              <li>El proceso puede tardar unos segundos dependiendo del tamaño del archivo</li>
              <li>No cierres esta ventana hasta que el proceso termine</li>
            </ul>
          </InfoBox>
        </MainCard>
      </Content>

      <Footer>
        <p>© 2025 AYHER — Sistema de Gestión</p>
      </Footer>
    </Container>
  );
};

export default RestaurarDB;

// Animaciones
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Estilos
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4ff 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const Header = styled.header`
  background: linear-gradient(270deg, #001f4d, #004aad);
  color: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .back-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.7rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateX(-5px);
    }
  }

  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const Content = styled.div`
  flex: 1;
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 2rem;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: ${slideIn} 0.6s ease-out;
`;

const MainCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const IconCircle = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 3rem;
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
  animation: ${float} 3s ease-in-out infinite;
`;

const Title = styled.h2`
  text-align: center;
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-size: 2.2rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #718096;
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

const Warning = styled.div`
  background: linear-gradient(135deg, #fff3cd, #ffe8a1);
  border: 2px solid #ffc107;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2.5rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2);

  div {
    flex: 1;
  }

  strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: #856404;
  }

  p {
    margin: 0;
    color: #856404;
    line-height: 1.6;
  }
`;

const WarningIcon = styled.div`
  font-size: 2rem;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StepCard = styled.div`
  background: linear-gradient(135deg, #f7fafc, #edf2f7);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  gap: 1.5rem;
  border: 2px solid #e2e8f0;
  transition: all 0.3s;

  &:hover {
    transform: translateX(5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
`;

const StepNumber = styled.div`
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #2d3748;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepDescription = styled.p`
  margin: 0 0 1rem 0;
  color: #718096;
  line-height: 1.6;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, #cbd5e0, transparent);
`;

const DividerText = styled.span`
  color: #a0aec0;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const FileInput = styled.div`
  input[type="file"] {
    display: none;
  }

  label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.3s;
    border: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    &:active {
      transform: translateY(-1px);
    }

    &.has-file {
      background: linear-gradient(135deg, #48bb78, #38a169);
    }
  }
`;

const FileName = styled.div`
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #e6fffa, #c6f6d5);
  border: 2px solid #48bb78;
  border-radius: 12px;
  color: #22543d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.2);

  svg {
    color: #48bb78;
    font-size: 1.2rem;
  }

  strong {
    flex: 1;
  }
`;

const FileSize = styled.span`
  background: rgba(72, 187, 120, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const BackupButton = styled.button`
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(72, 187, 120, 0.4);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const RestoreButton = styled.button`
  background: linear-gradient(135deg, #f56565, #e53e3e);
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(245, 101, 101, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(245, 101, 101, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  background: linear-gradient(135deg, #718096, #4a5568);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(113, 128, 150, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4a5568, #2d3748);
    transform: translateY(-3px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, #ebf8ff, #bee3f8);
  border: 2px solid #4299e1;
  border-radius: 16px;
  padding: 1.5rem;
  color: #2c5282;

  strong {
    display: block;
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
      line-height: 1.6;
    }

    li:last-child {
      margin-bottom: 0;
    }
  }
`;

const Footer = styled.footer`
  background: #001a33;
  color: white;
  text-align: center;
  padding: 1.5rem;
  margin-top: auto;
  position: relative;
  z-index: 10;

  p {
    margin: 0;
    font-weight: 500;
  }
`;
